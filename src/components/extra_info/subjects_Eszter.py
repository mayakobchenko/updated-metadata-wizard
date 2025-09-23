import json
import requests as rq
import copy
from uuid import uuid4

token = 'eyJ...'
id_prefix = 'https://kg.ebrains.eu/api/instances/'

# prime_adult: <60y
KG_ids = {
    'ADD': 'a66ae4f8-80d4-4893-becf-fac789759d6c',
    'Nold': '68d82a6c-8f49-43d2-9e0a-3b4fdf9c001c',
    'M': '744c9204-4aea-4eff-a4f4-d79f008b355f',
    'F': '7606df11-c8d9-4ca4-98e3-8167ce6f432b',
    'prime_adult': 'ccf5654f-3ee6-4370-93c6-cae7fef326ea',
    'late_adult': 'ee1b45fc-6376-4af8-becc-b11fae811f89'
}

vocab = {"@context": {"@vocab": "https://openminds.ebrains.eu/vocab/"}}

template_subj = {
    "@type": "https://openminds.ebrains.eu/core/Subject",
    "lookupLabel": "",
    "internalIdentifier": "",
    "biologicalSex": {"@id": ""},
    "isPartOf": {"@id": ""},
    "studiedState": {}
}

template_state = {
    "@type": "https://openminds.ebrains.eu/core/SubjectState",
    "lookupLabel": "",
    "age":
        {"@type": "https://openminds.ebrains.eu/core/QuantitativeValue",
         "unit": {"@id": "https://kg.ebrains.eu/api/instances/4042a7c2-20ba-4e21-8cac-d0d2e25145f0"},
         "value": 0},
    "ageCategory": {"@id": ""}
}


def KG_uuid():
    new_uuid = id_prefix + str(uuid4())
    return new_uuid


def KG_upload(instance):

    if not token:
        print('No token')
        return

    instance.update(vocab)
    inst_id = instance.pop("@id")

    headers = {
        "accept": "*/*",
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json; charset=utf-8"
    }

    content = json.dumps(instance, indent=4)
    url = 'https://core.kg.ebrains.eu/v3/instances/' + \
        inst_id.split('/')[-1] + '?space=dataset'
    resp = rq.post(url=url, headers=headers, data=content)
    # Add more error handling, e.g. invalid token
    if resp.status_code == 409:    # Instance already exists
        resp = rq.patch(url=url, headers=headers, data=content)


def add_subjects():
    subjects = []
    states = []
    with open('subjects.csv', 'r') as f:
        for line in f:
            name, group, age, sex = line.split(';')
            age = int(age)
            sex = sex.strip()

            subj = copy.deepcopy(template_subj)
            subj["lookupLabel"] = name
            subj["internalIdentifier"] = name
            subj["biologicalSex"]["@id"] = id_prefix + KG_ids[sex]
            subj["isPartOf"]["@id"] = id_prefix + KG_ids[group]
            subj_id = KG_uuid()
            subj["@id"] = subj_id

            state = copy.deepcopy(template_state)
            state["lookupLabel"] = name + "_state"
            state["age"]["value"] = age
            state["ageCategory"]["@id"] = id_prefix + \
                KG_ids["prime_adult"] if age < 60 else id_prefix + \
                KG_ids["late_adult"]
            state_id = KG_uuid()
            state["@id"] = state_id

            subj["studiedState"] = {"@id": state_id}
            subjects.append(subj)
            states.append(state)

    for subj in subjects:
        KG_upload(subj)

    for state in states:
        KG_upload(state)


def KG_patch(inst_id, attr):
    if not token:
        print('No token')
        return

    headers = {
        "accept": "*/*",
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json; charset=utf-8"
    }

    content = json.dumps(attr, indent=4)
    url = 'https://core.kg.ebrains.eu/v3/instances/' + \
        inst_id.split('/')[-1] + '?space=dataset'
    rq.patch(url=url, headers=headers, data=content)


def add_species():

    # Add "Homo sapiens" to all subject instances
    subjects = []
    with open('PDWAVES_subjects.txt', 'r') as sf:
        for line in sf:
            subjects.append(line.strip())

    species = {"https://openminds.ebrains.eu/vocab/species": {
        "@id": "https://kg.ebrains.eu/api/instances/97c070c6-8e1f-4ee8-9d28-18c7945921dd"}}

    for subj in subjects:
        KG_patch(subj, species)


if __name__ == '__main__':

    # TODO: Add pathology or attribute to subj states

    add = []
    with open('ADD_states.txt', 'r') as sf:
        for line in sf:
            add.append(line.strip())

    pathology = {"https://openminds.ebrains.eu/vocab/pathology": [
        {"@id": "https://kg.ebrains.eu/api/instances/161baa02-4e08-4cf2-a641-81cf323cc15d"}]}

    for state in add:
        KG_patch(state, pathology)

    nold = []
    with open('Nold_states.txt', 'r') as sf:
        for line in sf:
            nold.append(line.strip())

    attr = {"https://openminds.ebrains.eu/vocab/attribute": [
        {"@id": "https://kg.ebrains.eu/api/instances/f9523442-98c3-4789-a0ad-8c9eba252417"}]}

    for state in nold:
        KG_patch(state, attr)
