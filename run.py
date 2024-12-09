#!/usr/bin/env python3
import os
import time
from pathlib import Path

import click

from deploy import settings
from deploy.aws import aws, resource_details
from deploy.utils import run, timing


@click.group()
def cli():
    pass


@cli.command(help='Deploy the contact form handler to production')
@timing
def deploy_lambda():
    function_name = resource_details(
        settings.PROJECT_NAME,
        'ContactFormLambda',
    )['PhysicalResourceId']

    package_path = Path('contact-form-handler')
    run(
        'pip install '
        f'--target {package_path / "dependencies"} '
        f'-r {package_path / "requirements.txt"}'
    )
    package_path = Path('contact-form-handler')
    package_deps_path = package_path / 'dependencies'
    code_archive_name = 'contact-form-handler.zip'

    run(f'zip -qr ../{code_archive_name} .', cwd=package_deps_path)
    run(
        f'zip -qg {code_archive_name} pipedrive.py lambda_function.py',
        cwd=package_path,
    )

    code_archive_path = f'fileb://{package_path}/{code_archive_name}'
    aws(
        f'lambda update-function-code '
        f'--function-name {function_name} '
        f'--zip-file {code_archive_path} '
        f'--publish',
    )

    def get_function_config():
        return aws(
            f'lambda get-function --function-name {function_name}',
        )['Configuration']

    while True:
        function_config = get_function_config()
        status = function_config['LastUpdateStatus']
        if status != 'InProgress':
            break
        time.sleep(1)

    if status == 'Failed':
        status_reason = function_config['LastUpdateStatusReason']
        status_reason_code = function_config['LastUpdateStatusReasonCode']
        raise RuntimeError(
            f'Failed to update lambda function. '
            f'Reason: {status_reason_code} | {status_reason}.',
        )

    from_email = os.environ['CONTACT_FORM_FROM_EMAIL']
    to_email = os.environ['CONTACT_FORM_TO_EMAIL']
    api_token = os.environ['PIPE_DRIVE_API_TOKEN']
    lead_custom_data = os.getenv('PIPE_DRIVE_LEAD_CUSTOM_DATA').replace(
        '"', '\\"',
    )

    aws(
        f'lambda update-function-configuration '
        f'--function-name {function_name} '
        '--timeout 50 '
        f'--environment "Variables={{'
        f"CONTACT_FORM_FROM_EMAIL='{from_email}',"
        f'CONTACT_FORM_TO_EMAIL={to_email},'
        f'PIPE_DRIVE_API_TOKEN={api_token},'
        f"PIPE_DRIVE_LEAD_CUSTOM_DATA='{lead_custom_data}',"
        f'}}"',
    )


if __name__ == '__main__':
    cli()
