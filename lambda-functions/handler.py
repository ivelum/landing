import logging

import sentry_sdk
from sentry_sdk.integrations.aws_lambda import AwsLambdaIntegration
from newsletter_sign_up import handle_newsletter_sign_up


logger = logging.getLogger()
logger.setLevel(logging.INFO)


sentry_sdk.init(
    dsn="https://5dd58ec394b556f352248ba56bc7876f@o202054.ingest.sentry.io"
        + "/4506218347954176",
    integrations=[AwsLambdaIntegration()],
    traces_sample_rate=1.0,
    profiles_sample_rate=1.0,
)


def lambda_handler(event, context):
    logger.info('lambda_handler(): invoked. event={}'.format(event))
    try:
        rawPath = event['rawPath']
        match rawPath:
            case '/newsletter':
                return handle_newsletter_sign_up(event, context)
            case _:
                return {
                    'statusCode': 404,
                }
    except Exception as e:
        sentry_sdk.capture_exception(e)
        logger.exception('lambda_handler(): routing failed')
