import fairgraph
from fairgraph import KGClient
from fairgraph.openminds.core import DatasetVersion
from fairgraph.openminds.core import Dataset

personal_token = "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJLYU01NTRCM2RmMHBIamZYWi1aRl94bUUwMThPS1R0RkNjMjR3aVVqQmFvIn0.eyJleHAiOjE3NTkzOTg1NTQsImlhdCI6MTc1OTM5Njc1NCwiYXV0aF90aW1lIjoxNzU5MTM0NDk1LCJqdGkiOiI5ZWZlNWI3Mi1kZjQ3LTRjOTEtOTU2ZC0xNGY0MjA0NDQ5YzYiLCJpc3MiOiJodHRwczovL2lhbS5lYnJhaW5zLmV1L2F1dGgvcmVhbG1zL2hicCIsImF1ZCI6WyJ4d2lraSIsInRlYW0iLCJncm91cCJdLCJzdWIiOiI3YWVjMmJmMi04MmM4LTQwYzEtYmQ2NC0xNzNjYWJjZmQ4NDIiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJrZyIsInNpZCI6ImFkMzVkMTBhLTkyOWYtNDllMy05YmIwLWI0OWRhYzE0NTcyZSIsInNjb3BlIjoicHJvZmlsZSByb2xlcyBlbWFpbCBvcGVuaWQgZ3JvdXAgY2xiLndpa2kucmVhZCB0ZWFtIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJNYXlhIEtvYmNoZW5rbyIsIm1pdHJlaWQtc3ViIjoiMjM4MDk0NjMyOTI1NTYxNiIsInByZWZlcnJlZF91c2VybmFtZSI6Im1heWFrb2JjaGVua28iLCJnaXZlbl9uYW1lIjoiTWF5YSIsImZhbWlseV9uYW1lIjoiS29iY2hlbmtvIiwiZW1haWwiOiJtYXlhLmtvYmNoZW5rb0BtZWRpc2luLnVpby5ubyJ9.JnC79Rji5cKXGbo8ruYAjHRQzivGZrOGS7Li-XDeiKGlK7kZ3bdKKP42xsYngfUUWgZ95fuNFkYAO_IOIimegDom3zBb_9bvaEIrdCr3sVpK81RmPcc-iFeraYErB2npnuUEnM-xe4UMNIV1zzM4blP_Dg23BbLGKTNb1SA4F45DwjS-cwXMbvHh5PZ_9jM9GdJzu6Yrxg6yX4gXauY9s_E2HVd-BTAdzkaUePKxu941jwT4oIDs6ZBGAhjEyu4IJ_QC85XQ4V7q3wCKw62W-cXfyZX4h8UwgC6Ni3mNUhW-5Q619NxAErAyYUmVsycQxQJtbWWEJDNsoEMKWaiV3Q"
client = KGClient(personal_token, host="core.kg.ebrains.eu")

DS_ID = '4e07beb1-1559-4c04-b4cd-a11512316103'

DSV_ID = 'd5088e83-cbf1-4ea2-b64c-b10778121b4e'
# '8f1f65bb-44cb-4312-afd4-10f623f929b8'  # Signy
DSV_release = '724d4af0-fe28-4032-8837-120b0d64a81c'


DS = Dataset.from_id('3f83acd4-c861-40bf-8cc3-9a15e0a017de',
                     client, scope="released")
# data_types = DS.data_types.resolve(client)
# print(data_types)
# print(DS.has_versions)
print(DS)
# print(DS.description)
# print(DS.full_name)
# print(DS.accessibility)
# print(DS.release_date)

DSV = DatasetVersion.from_id(DSV_release, client, scope="in progress")
# print(DSV.accessibility.resolve(client))
print(DSV.release_date)


dataset_example = Dataset.from_id(
    DS_ID,
    client,
    scope="released",
    follow_links={
        "has_versions": {
            "authors": {}
        }
    }
)

# dsv_lsit = [dsv for dsv in dataset_example]
# for dsv in dsv_lsit:
#    print(dsv.name)

# print(dataset_example)
