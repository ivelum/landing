import json
import logging
import os
import re
from json import JSONDecodeError

import boto3
import sentry_sdk


logger = logging.getLogger()
logger.setLevel(logging.INFO)


# Line order and labels in the email match what the person saw in the form.
# A field missing from here still reaches the email, under its own key: the
# form may grow a field before anyone gets round to this dictionary.
FIELD_LABELS = {
    'name': 'Name',
    'email': 'Email',
    'company': 'Company name or website',
    'accelerator': 'Startup accelerator',
    'source': 'Source',
    'page': 'Page',
}

# The form checks these three itself, so they only arrive empty when
# something bypassed it. The fourth field is optional.
REQUIRED_FIELDS = ('name', 'email', 'company')

# The sender's address goes into Reply-To, the one place where a value from
# the form ends up in an email header. So only accept what cannot be read as
# a list of addresses or as anything else structural.
SAFE_EMAIL = re.compile(r'^[^\s,;:<>"]+@[^\s,;:<>"]+\.[^\s,;:<>"]+$')


def json_response(status_code, payload):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json'
        },
        'body': json.dumps(payload),
    }


def build_email_body(form_data):
    """Plain text: one line per field, `label - value`."""
    extra_keys = [key for key in form_data if key not in FIELD_LABELS]
    lines = []
    for key in list(FIELD_LABELS) + extra_keys:
        if key not in form_data:
            continue
        value = str(form_data[key]).strip()
        label = FIELD_LABELS.get(key, key)
        lines.append(f'{label} - {value or "(not specified)"}')
    return '\n'.join(lines)


def send_email(form_data):
    logger.info('send_email(): start')
    from_email = os.environ['CONTACT_FORM_FROM_EMAIL']
    to_email = os.environ['CONTACT_FORM_TO_EMAIL']

    client = boto3.client('ses')

    message = {
        'Subject': {
            'Charset': 'utf-8',
            'Data': 'New request from the contact form',
        },
        'Body': {
            'Text': {
                'Charset': 'utf-8',
                'Data': build_email_body(form_data),
            },
        },
    }

    # A reply to the email goes straight to the person, not to the sender
    # address, which nobody reads.
    # ASCII only: SES rejects a non-ASCII address outright, which would lose
    # the whole request instead of merely sending it without a Reply-To.
    extra = {}
    reply_to = str(form_data.get('email', '')).strip()
    if reply_to.isascii() and SAFE_EMAIL.match(reply_to):
        extra['ReplyToAddresses'] = [reply_to]

    client.send_email(
        Source=from_email,
        Destination={
            'ToAddresses': [to_email],
        },
        Message=message,
        **extra,
    )
    logger.info('send_email(): success')


def handle_contact_form(event, context):
    if event['requestContext']['http']['method'] != 'POST':
        return json_response(400, {
            'success': False,
            'message': 'Unsupported http method',
        })

    try:
        body = json.loads(event.get('body') or '')
    except JSONDecodeError:
        logger.error('handle_contact_form(): invalid request body')
        return json_response(400, {
            'success': False,
            'message': 'Invalid request body',
        })

    if not isinstance(body, dict):
        logger.error('handle_contact_form(): request body is not an object')
        return json_response(400, {
            'success': False,
            'message': 'Invalid request body',
        })

    missing = [
        field for field in REQUIRED_FIELDS
        if not str(body.get(field) or '').strip()
    ]
    if missing:
        logger.error(
            'handle_contact_form(): missing fields {}'.format(missing))
        return json_response(400, {
            'success': False,
            'message': 'Missing required fields: {}'.format(
                ', '.join(missing)),
        })

    logger.info('handle_contact_form(): invoked')
    try:
        send_email(body)
    except Exception as e:
        # A failing SES send is ours to fix, not the sender's: there is
        # nothing they could do differently, and an error screen would only
        # push them to send the same request again by hand. So the request is
        # answered as accepted, and the Sentry event carries every field —
        # it reaches the team's Slack channel, and it is the only place the
        # request can be recovered from until the send is fixed.
        with sentry_sdk.push_scope() as scope:
            scope.set_tag('form', 'contact')
            scope.set_extra('form_data', body)
            sentry_sdk.capture_exception(e)
        logger.exception('handle_contact_form(): send_email failed')

    return json_response(200, {'success': True})
