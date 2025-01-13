import logging
import os

import sentry_sdk
from sentry_sdk.integrations.aws_lambda import AwsLambdaIntegration
from crisp_api import Crisp


logger = logging.getLogger()
logger.setLevel(logging.INFO)


sentry_sdk.init(
    dsn="https://5dd58ec394b556f352248ba56bc7876f@o202054.ingest.sentry.io"
        + "/4506218347954176",
    integrations=[AwsLambdaIntegration()],
    traces_sample_rate=1.0,
    profiles_sample_rate=1.0,
)


def add_crisp_contact(event_body):
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
        crisp.website.add_new_people_profile(
            website_id=website_id,
            data={
                'email': event_body['email'],
                'person': {'nickname': event_body['email']},
                'segments': 'newsletter',
            },
        )
    except Exception as e:
        sentry_sdk.capture_exception(e)
        logger.exception('add_crisp_contact(): add_crisp_contact failed')
        return

    logger.info('add_crisp_contact(): success')


def handle_newsletter_sign_up(event):
    assert event.get('email') is not None

    logger.info(
        'handle_newsletter_sign_up():'
        'add_crisp_contact invoked. event={}'.format(event)
    )
    try:
        add_crisp_contact(event)
    except Exception as e:
        sentry_sdk.capture_exception(e)
        logger.exception(
            'handle_newsletter_sign_up(): '
            'add_crisp_contact failed'
        )
