"""The contact form handler.

boto3 and sentry_sdk are not installed in the root environment — they are
only needed inside the lambda — so both are stubbed before the handler is
imported. That way the test sees exactly what would reach SES and Sentry
without going near either of them.
"""
import json
import sys
import types
from pathlib import Path

import pytest


LAMBDA_PATH = Path(__file__).resolve().parent.parent / 'lambda-functions'

FORM = {
    'name': 'Anna Petrova',
    'email': 'anna@acme.com',
    'company': 'Acme Inc.',
    'accelerator': 'Y Combinator',
}


class FakeSES:
    def __init__(self, store):
        self.store = store

    def send_email(self, **kwargs):
        if self.store['fail']:
            raise RuntimeError('SES is down')
        self.store['sent'].append(kwargs)


class FakeScope:
    def __init__(self, store):
        self.store = store

    def __enter__(self):
        return self

    def __exit__(self, *exc_info):
        return False

    def set_extra(self, key, value):
        self.store['extras'][key] = value

    def set_tag(self, key, value):
        self.store['tags'][key] = value


@pytest.fixture
def lambda_module(monkeypatch):
    store = {'sent': [], 'fail': False, 'extras': {}, 'tags': {},
             'exceptions': []}

    boto3 = types.ModuleType('boto3')
    boto3.client = lambda name: FakeSES(store)

    sentry_sdk = types.ModuleType('sentry_sdk')
    sentry_sdk.push_scope = lambda: FakeScope(store)
    sentry_sdk.capture_exception = store['exceptions'].append

    monkeypatch.setitem(sys.modules, 'boto3', boto3)
    monkeypatch.setitem(sys.modules, 'sentry_sdk', sentry_sdk)
    monkeypatch.syspath_prepend(str(LAMBDA_PATH))
    monkeypatch.setenv('CONTACT_FORM_FROM_EMAIL', 'contact@new.ivelum.com')
    monkeypatch.setenv('CONTACT_FORM_TO_EMAIL', 'info@ivelum.com')
    monkeypatch.delitem(sys.modules, 'contact_form', raising=False)

    import contact_form

    return contact_form, store


def post(module, body, method='POST'):
    return module.handle_contact_form({
        'requestContext': {'http': {'method': method}},
        'body': body if isinstance(body, str) else json.dumps(body),
    }, None)


def test_full_request_sends_one_plain_text_email(lambda_module):
    module, store = lambda_module
    response = post(module, FORM)

    assert response['statusCode'] == 200
    assert json.loads(response['body']) == {'success': True}

    mail, = store['sent']
    assert mail['Source'] == 'contact@new.ivelum.com'
    assert mail['Destination']['ToAddresses'] == ['info@ivelum.com']
    assert 'Html' not in mail['Message']['Body']
    # Replying to the email means replying to whoever sent the request.
    assert mail['ReplyToAddresses'] == ['anna@acme.com']
    assert mail['Message']['Body']['Text']['Data'].splitlines() == [
        'Name - Anna Petrova',
        'Email - anna@acme.com',
        'Company name or website - Acme Inc.',
        'Startup accelerator - Y Combinator',
    ]


def test_empty_optional_field_is_still_a_line(lambda_module):
    module, store = lambda_module
    post(module, {**FORM, 'accelerator': ''})

    body = store['sent'][-1]['Message']['Body']['Text']['Data']
    assert body.endswith('Startup accelerator - (not specified)')


def test_source_and_page_are_named_lines(lambda_module):
    module, store = lambda_module
    post(module, {
        **FORM,
        'source': 'startup-discount',
        'page': '/industries/startups/',
    })

    body = store['sent'][-1]['Message']['Body']['Text']['Data']
    assert body.splitlines()[-2:] == [
        'Source - startup-discount',
        'Page - /industries/startups/',
    ]


def test_unknown_field_reaches_the_email_under_its_own_key(lambda_module):
    """The form may grow a field before the handler hears about it."""
    module, store = lambda_module
    post(module, {**FORM, 'utm_campaign': 'spring'})

    body = store['sent'][-1]['Message']['Body']['Text']['Data']
    assert body.endswith('utm_campaign - spring')


def test_address_that_looks_like_a_list_never_becomes_reply_to(lambda_module):
    module, store = lambda_module
    post(module, {**FORM, 'email': 'anna@acme.com, boss@example.com'})

    assert 'ReplyToAddresses' not in store['sent'][-1]


@pytest.mark.parametrize('body,method', [
    ({'name': 'Anna', 'email': '', 'company': '  '}, 'POST'),
    ('not json', 'POST'),
    ('', 'POST'),
    ('[1, 2]', 'POST'),
    (FORM, 'GET'),
])
def test_bad_request_is_rejected_without_sending(lambda_module, body, method):
    module, store = lambda_module
    response = post(module, body, method=method)

    assert response['statusCode'] == 400
    assert store['sent'] == []


def test_missing_fields_are_named_in_the_answer(lambda_module):
    module, _ = lambda_module
    response = post(module, {'name': 'Anna', 'email': '', 'company': '  '})

    message = json.loads(response['body'])['message']
    assert 'email' in message and 'company' in message


def test_failed_send_is_still_accepted_and_reported_to_sentry(lambda_module):
    """A broken send is the team's problem, not the sender's."""
    module, store = lambda_module
    store['fail'] = True

    response = post(module, FORM)

    assert response['statusCode'] == 200
    assert json.loads(response['body']) == {'success': True}
    assert store['sent'] == []
    # The email never went out, so the Sentry event is the only place the
    # request can be recovered from.
    assert store['extras']['form_data'] == FORM
    assert store['tags']['form'] == 'contact'
    assert len(store['exceptions']) == 1
