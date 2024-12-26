import requests


PIPEDRIVE_API_BASE_URL = 'https://api.pipedrive.com/v1'


class PipedriveClient:
    def __init__(self, api_key, initial_lead_data=None):
        self.api_key = api_key
        self._auth_params = {
            'api_token': api_key
        }
        self.initial_lead_data = initial_lead_data or {}

    def _create(self, what, data):
        r = requests.post(
            PIPEDRIVE_API_BASE_URL + '/' + what, json=data,
            params=self._auth_params, timeout=10)
        r.raise_for_status()

        return r.json()['data']['id']

    def create_lead(self, title, person_id, organization_id):
        """
        Create lead
        :param title: lead title
        :param person_id: person id
        :return: lead id
        """
        lead_data = self.initial_lead_data.copy()
        lead_data.update({
            'title': title,
            'person_id': person_id,
            'organization_id': organization_id
        })
        return self._create('leads', lead_data)

    def create_lead_note(self, lead_id, note_html):
        """
        Create lead note
        :param lead_id: lead id
        :param note_html: note HTML
        :return: note id
        """
        note_data = {
            'content': note_html,
            'lead_id': lead_id,
            'pinned_to_lead_flag': True
        }
        return self._create('notes', note_data)

    def create_person(self, name, email, organization_id):
        """
        Create person
        :param name: person name
        :param email: person email
        :param organization_id: organization id
        :return: person id
        """
        person_data = {
            'name': name,
            'email': [
                {
                    "value": email,
                    "primary": "true",
                    "label": "main"
                },
            ],
            'org_id': organization_id
        }
        return self._create('persons', person_data)

    def create_organization(self, name):
        """
        Create organization
        :param name: organization name
        :return: organization id
        """
        organization_data = {
            'name': name
        }
        return self._create('organizations', organization_data)

    def _search(self, what, query_params):
        """
        Search pipidrive for a given object
        :param what: what to search for
        :param query_params: query parameters
        :return: object id or None
        """
        query_params.update(self._auth_params)
        r = requests.get(
            PIPEDRIVE_API_BASE_URL + '/' + what + '/search',
            params=query_params, timeout=10)
        r.raise_for_status()

        response_json = r.json()
        if len(response_json['data']['items']) > 0:
            return response_json['data']['items'][0]['item']['id']
        return None

    def search_organization(self, name):
        """
        Search organization by name
        :param name: organization name
        :return: organization id or None
        """
        organization_search_query_params = {
            'term': name,
            'exact_match': 0,
            'fields': 'name',
            'limit': 1
        }
        return self._search('organizations', organization_search_query_params)

    def search_person(self, email):
        """
        Search person by email
        :param email: email
        :return: person id or None
        """
        person_search_query_params = {
            'term': email,
            'exact_match': 1,
            'limit': 1
        }
        return self._search('persons', person_search_query_params)
