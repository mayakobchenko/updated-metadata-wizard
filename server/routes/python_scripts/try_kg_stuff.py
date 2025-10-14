from fairgraph.openminds.core import Organization
import fairgraph
from fairgraph import KGClient
from fairgraph.openminds.core import DatasetVersion
from fairgraph.openminds.core import Dataset
from fairgraph.openminds.core import ORCID, Person

personal_token = "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJLYU01NTRCM2RmMHBIamZYWi1aRl94bUUwMThPS1R0RkNjMjR3aVVqQmFvIn0.eyJleHAiOjE3NTk3NTcwNjAsImlhdCI6MTc1OTc1NTI2MCwiYXV0aF90aW1lIjoxNzU5NzM5NjQ5LCJqdGkiOiI4MjNjZjRmMS0yNDE1LTRmMDEtOGI3MC0xZDEzZDA1MjFhZTQiLCJpc3MiOiJodHRwczovL2lhbS5lYnJhaW5zLmV1L2F1dGgvcmVhbG1zL2hicCIsImF1ZCI6WyJ4d2lraSIsInRlYW0iLCJncm91cCJdLCJzdWIiOiI3YWVjMmJmMi04MmM4LTQwYzEtYmQ2NC0xNzNjYWJjZmQ4NDIiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJrZyIsInNpZCI6ImM2ZjY3MWM5LTk3ODctNDg1ZC1iMzFhLTI3YTM3ZDY0ZTFmYyIsInNjb3BlIjoicHJvZmlsZSByb2xlcyBlbWFpbCBvcGVuaWQgZ3JvdXAgY2xiLndpa2kucmVhZCB0ZWFtIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJNYXlhIEtvYmNoZW5rbyIsIm1pdHJlaWQtc3ViIjoiMjM4MDk0NjMyOTI1NTYxNiIsInByZWZlcnJlZF91c2VybmFtZSI6Im1heWFrb2JjaGVua28iLCJnaXZlbl9uYW1lIjoiTWF5YSIsImZhbWlseV9uYW1lIjoiS29iY2hlbmtvIiwiZW1haWwiOiJtYXlhLmtvYmNoZW5rb0BtZWRpc2luLnVpby5ubyJ9.dlLDIA9LDV0i3dmqLr_LaETF5WEsXTKylUunLxz9gQLnMUYqfsjEZ5HUs8NTuFYBHbfoNlAuqeg4qh7aWHClLNXr7nQkaTwQq8nmeJtPWfDIc6TDQMLrM7uegGTTAc4VBM3Ch67N6RywYOgPc-aGTP06w63PSuymsk161Yj8fg-aI5JWKYuruG_VTMZhMJppNZPLah2U6DolhvShejZzaPYUnFq9R45fk9FNZpE25cgrirN1eS0F_EU90eS--zRq9gngXX6U7FI_P0sRv2gCxmHqy0gcogqpthnm_45KuZWgIAhiH-_wTPApU0qAViMCjNIMvTBtcBZbMySDtfDp3A"
client = KGClient(personal_token, host="core.kg.ebrains.eu")

# DS_ID = '4e07beb1-1559-4c04-b4cd-a11512316103'

# DSV_ID = 'd5088e83-cbf1-4ea2-b64c-b10778121b4e'
# 3f83acd4-c861-40bf-8cc3-9a15e0a017de
# '8f1f65bb-44cb-4312-afd4-10f623f929b8'

# 13b53eef-867d-4546-a435-d4819ae17734 # Signy example of embargo because of submission
DSV_maya = '724d4af0-fe28-4032-8837-120b0d64a81c'  # my own test dsv


# DS = DatasetVersion.from_id('13b53eef-867d-4546-a435-d4819ae17734', client, scope="released")

DS = DatasetVersion.from_id(DSV_maya, client, scope="in progress")
# data_types = DS.data_types.resolve(client)
# print(data_types)
# print(DS.has_versions)
# print(DS)
# print(DS.description)
# print(DS.full_name)
# print(DS.accessibility.resolve(client).name)
# print(DS.properties)
# print(DS.custodians)
# print(DS.authors)  # Tom Bombadil, Robin De Schepper
# print(DS.copyright)
# print(DS.behavioral_protocols)

# DSV = DatasetVersion.from_id(DSV_maya, client, scope="in progress")
# print(DSV.accessibility.resolve(client))
# print(DSV.release_date)


# dataset_example = Dataset.from_id(DS_ID, client, scope="released", follow_links={"has_versions": {"authors": {}}})

# dsv_lsit = [dsv for dsv in dataset_example]
# for dsv in dsv_lsit:
#    print(dsv.name)

# print(dataset_example)

# people = fairgraph.openminds.core.Person.by_name('Robin De Schepper', client)
# print(people)

# organizations = Organization.list(client)
# for i in organizations:
#    print(i.name)

def exist_person(given_name, family_name, client):

    person_instance = Person.list(client, family_name=family_name)

    for i in range(len(person_instance)):
        print(person_instance[i])
        if person_instance[i].given_name == given_name:
            print(
                f"{person_instance[i].given_name} {person_instance[i].family_name} found in KG")
            return person_instance[i]

    person_instance = Person.list(
        client, family_name=family_name, scope="in progress")
    for i in range(len(person_instance)):
        print('inprogress:', person_instance[i])
        if person_instance[i].given_name == given_name:

            print(
                f"{person_instance[i].given_name} {person_instance[i].family_name} found in KG (unpublished)")
            return person_instance[i]

    print(f"{given_name} {family_name} not found in KG ")
    return []


my_person = exist_person('Maya', 'Kobchenko', client)
# print(my_person)


# person_instance = Person.list(client, family_name='Kobchenko')
# for i in person_instance:
#    print(i)

# person_instance_pr = Person.list(
#    client, family_name='Kobchenko', scope="in progress")
# for i in person_instance_pr:
#    print(i)


person_instance = Person.list(client, family_name='Kobchenko')
# print(person_instance[0].developed.resolve(client))
print('my orcid:', person_instance[0].digital_identifiers)

my_orcid = 'https://orcid.org/0000-0001-8359-3486'

find_my_orcid = Person.list(client, digital_identifiers=my_orcid)
print('find orcid in kg:')
for i in find_my_orcid:
    print(i)
# fairgraph.openminds.core.digital_identifier.orcid.ORCID
# print(help(fairgraph.openminds.core.digital_identifier.orcid.ORCID))
# print(help(fairgraph.openminds.core.digital_identifier))
person_properties = person_instance[0].properties
# print(person_instance[0].properties)
for i in person_properties:
    print(i)

# Charl Linssen
# Cantarelli Matteo

# controlled_terms.Technique.property_names
person_instance = Person.list(client, family_name='Kobchenko')

# from fairgraph.openminds.controlledterms import SemanticDataType
# data_types_list = SemanticDataType.list(client, size=100, from_index=0, api='auto', scope='released', resolved=False, space=None)
# [item.name for item in data_types_list]

# person_list = Person.list(client, size=100, from_index=0,
#                          api='auto', scope='released', resolved=False, space=None)
# for i in person_list:
#    print(i.family_name, i.given_name)


person_try = Person.list(client, family_name='Cantarelli')
for i in person_try:
    print(i.family_name, i.given_name)
