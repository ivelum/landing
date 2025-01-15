import json
import logging
import os
from json import JSONDecodeError

import sentry_sdk
from sentry_sdk.integrations.aws_lambda import AwsLambdaIntegration
from crisp_api import Crisp, RouteError


logger = logging.getLogger()
logger.setLevel(logging.INFO)


sentry_sdk.init(
    dsn="https://5dd58ec394b556f352248ba56bc7876f@o202054.ingest.sentry.io"
        + "/4506218347954176",
    integrations=[AwsLambdaIntegration()],
    traces_sample_rate=1.0,
    profiles_sample_rate=1.0,
)


def add_crisp_contact(email):
    logger.info('add_crisp_contact(): start')
    crisp = Crisp()
    crisp.set_tier('plugin')
    website_id = os.environ['CRISP_WEBSITE_ID']
    token_id = os.environ['CRISP_TOKEN_ID']
    token_key = os.environ['CRISP_TOKEN_KEY']

    if not (website_id and token_id and token_key):
        logger.info('Crisp credentials are missing!')
        return

    crisp.authenticate(token_id, token_key)

    try:
        contact_just_created = False
        try:
            contact_data = crisp.website.get_people_profile(
                website_id=website_id,
                people_id=email,
            )
            contact_just_created = True
        except RouteError:
            contact_data = crisp.website.add_new_people_profile(
                website_id=website_id,
                data={
                    'email': email,
                    'person': {'nickname': email},
                    'segments': ['newsletter'],
                },
            )

        if contact_just_created:
            subscription_status = crisp.website.get_people_subscription_status(
                website_id=website_id,
                people_id=contact_data['people_id'],
            )
            if not subscription_status['email']:
                crisp.website.update_people_subscription_status(
                    website_id=website_id,
                    people_id=contact_data['people_id'],
                    data={'email': True},
                )

        return True
    except Exception as e:
        sentry_sdk.capture_exception(e)
        logger.exception('add_crisp_contact(): add_crisp_contact failed')
        return False

    logger.info('add_crisp_contact(): success')


def handle_newsletter_sign_up(event, context):
    if event['requestContext']['http']['method'] != 'POST':
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'success': False,
                'message': 'Unsupported http method'
            })
        }

    if event['body']:
        try:
            body = json.loads(event['body'])
        except JSONDecodeError:
            logger.error(
                'handle_newsletter_sign_up(): invalid request body')
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'success': False,
                    'message': 'invalid request body'
                })
            }

    assert body['email'] is not None

    logger.info(
        'handle_newsletter_sign_up():'
        'add_crisp_contact invoked. event={}'.format(event)
    )
    email = body['email']
    try:
        result = add_crisp_contact(email)
        if result:
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'success': True,
                })
            }
        else:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'success': False,
                })
            }

    except Exception as e:
        sentry_sdk.capture_exception(e)
        logger.exception(
            'handle_newsletter_sign_up(): '
            'add_crisp_contact failed'
        )
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'success': False
            })
        }
