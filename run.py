#!/usr/bin/env -S uv run
import json
import os
import time
from pathlib import Path
from shlex import quote

import click

from deploy import settings
from deploy.aws import aws, resource_details
from deploy.utils import run, timing


@click.group()
def cli():
    pass


@cli.command(help='Deploy the lambda functions to production')
@timing
def deploy_lambda():
    package_path = Path('lambda-functions')
    run(
        'uv pip install '
        f'--target {package_path / "dependencies"} '
        f'-r {package_path / "pyproject.toml"}'
    )
    package_path = Path('lambda-functions')
    package_deps_path = package_path / 'dependencies'
    code_archive_name = 'lambda-functions.zip'

    run(f'zip -qr ../{code_archive_name} .', cwd=package_deps_path)
    run(
        f'zip -qg {code_archive_name} pipedrive.py lambda_function.py',
        cwd=package_path,
    )

    function_name = resource_details(
        settings.PROJECT_NAME,
        'ContactFormLambda',
    )['PhysicalResourceId']
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

    environment = {
        'Variables': {
            'CONTACT_FORM_FROM_EMAIL': settings.CONTACT_FORM_FROM_EMAIL,
            'CONTACT_FORM_TO_EMAIL': settings.CONTACT_FORM_TO_EMAIL,
            'PIPE_DRIVE_API_TOKEN': os.environ['PIPE_DRIVE_API_TOKEN'],
            'PIPE_DRIVE_LEAD_CUSTOM_DATA':
                os.environ['PIPE_DRIVE_LEAD_CUSTOM_DATA'],
        },
    }
    aws(
        f'lambda update-function-configuration '
        f'--function-name {function_name} '
        '--timeout 50 '
        f'--environment {quote(json.dumps(environment))}',
    )


if __name__ == '__main__':
    cli()
