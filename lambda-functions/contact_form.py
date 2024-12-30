import json
import logging
import os
from json import JSONDecodeError

import boto3
import pipedrive
import sentry_sdk
from sentry_sdk.integrations.aws_lambda import AwsLambdaIntegration


logger = logging.getLogger()
logger.setLevel(logging.INFO)


sentry_sdk.init(
    dsn="https://5dd58ec394b556f352248ba56bc7876f@o202054.ingest.sentry.io"
        + "/4506218347954176",
    integrations=[AwsLambdaIntegration()],
    traces_sample_rate=1.0,
    profiles_sample_rate=1.0,
)


def create_crm_lead(form_data):
    logger.info('create_crm_lead(): start')

    api_token = os.environ['PIPE_DRIVE_API_TOKEN']
    lead_custom_data = os.getenv('PIPE_DRIVE_LEAD_CUSTOM_DATA')

    if lead_custom_data:
        try:
            lead_custom_data = json.loads(lead_custom_data)
        except JSONDecodeError:
            logger.error(
                'create_crm_lead(): invalid PIPE_DRIVE_LEAD_CUSTOM_DATA')
            lead_custom_data = None

    client = pipedrive.PipedriveClient(api_token, lead_custom_data)
    person_id = client.search_person(form_data['email'])
    if person_id:
        logger.info(
            f'create_crm_lead(): person already exists with id {person_id}')
        return

    org_id = client.search_organization(form_data['company'])
    if not org_id:
        org_id = client.create_organization(form_data['company'])
        logger.info(
            f'create_crm_lead(): created organization with id {org_id}')

    person_id = client.create_person(
        form_data['name'], form_data['email'], org_id)
    logger.info(f'create_crm_lead(): created person with id {person_id}')

    trimmed_text = "{}...".format(form_data['text'][:100]) if len(
                          form_data['text']) > 100 else form_data['text']
    lead_title = form_data['name'] + ' -> ' + trimmed_text

    lead_id = client.create_lead(lead_title, person_id, org_id)
    logger.info(f'create_crm_lead(): created lead with id {lead_id}')

    note_html = '<br/>'.join([
        f'<b>Name:</b> {form_data["name"]}',
        f'<b>Email:</b> {form_data["email"]}',
        f'<b>Subject:</b> {form_data["subject"]}',
        f'<b>Company:</b> {form_data["company"]}',
        '',
        '<b>Message:</b>',
        form_data["text"],
    ])
    note_id = client.create_lead_note(lead_id, note_html)
    logger.info(f'create_crm_lead(): created lead note with id {note_id}')


def send_email(event_body):
    logger.info('send_email(): start')
    from_email = os.environ['CONTACT_FORM_FROM_EMAIL']
    to_email = os.environ['CONTACT_FORM_TO_EMAIL']

    client = boto3.client('ses')

    body = '<html><body>'
    for k, v in event_body.items():
        body += f'{k}: {v}<br/>'
    body += '</body></html>'
    email_message = {
        'Body': {
            'Html': {
                'Charset': 'utf-8',
                'Data': body,
            },
        },
        'Subject': {
            'Charset': 'utf-8',
            'Data': 'New message from contact form',
        },
    }
    client.send_email(
        Destination={
            'ToAddresses': [to_email],
        },
        Message=email_message,
        Source=from_email,
    )
    logger.info('send_email(): success')


def lambda_handler(event, context):
    assert event.get('subject') is not None
    assert event.get('text') is not None
    assert event.get('email') is not None
    assert event.get('name') is not None
    assert event.get('company') is not None

    logger.info('lambda_handler(): invoked. event={}'.format(event))
    try:
        # try to create CRM lead
        create_crm_lead(event)
    except Exception as e:
        sentry_sdk.capture_exception(e)
        logger.exception('lambda_handler(): create_lead failed')
        # fallback to sending email if CRM lead creation fails
        send_email(event)
