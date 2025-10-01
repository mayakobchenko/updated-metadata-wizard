import fairgraph
from fairgraph import KGClient
from fairgraph.openminds.core import DatasetVersion
from fairgraph.openminds.core import Dataset

personal_token = "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJLYU01NTRCM2RmMHBIamZYWi1aRl94bUUwMThPS1R0RkNjMjR3aVVqQmFvIn0.eyJleHAiOjE3NTkzMjI3MDgsImlhdCI6MTc1OTMyMDkwOCwiYXV0aF90aW1lIjoxNzU5MTM0NDk1LCJqdGkiOiJhZjM5YWVlOS03NzUzLTRkNDQtYTU2Mi03YjI5NmFiN2NkNTQiLCJpc3MiOiJodHRwczovL2lhbS5lYnJhaW5zLmV1L2F1dGgvcmVhbG1zL2hicCIsImF1ZCI6WyJ4d2lraSIsInRlYW0iLCJncm91cCJdLCJzdWIiOiI3YWVjMmJmMi04MmM4LTQwYzEtYmQ2NC0xNzNjYWJjZmQ4NDIiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJrZyIsInNpZCI6ImFkMzVkMTBhLTkyOWYtNDllMy05YmIwLWI0OWRhYzE0NTcyZSIsInNjb3BlIjoicHJvZmlsZSByb2xlcyBlbWFpbCBvcGVuaWQgZ3JvdXAgY2xiLndpa2kucmVhZCB0ZWFtIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJNYXlhIEtvYmNoZW5rbyIsIm1pdHJlaWQtc3ViIjoiMjM4MDk0NjMyOTI1NTYxNiIsInByZWZlcnJlZF91c2VybmFtZSI6Im1heWFrb2JjaGVua28iLCJnaXZlbl9uYW1lIjoiTWF5YSIsImZhbWlseV9uYW1lIjoiS29iY2hlbmtvIiwiZW1haWwiOiJtYXlhLmtvYmNoZW5rb0BtZWRpc2luLnVpby5ubyJ9.nucQwXpkD-WxhyFA1D-XuSeVcdLT5mDzLBf3gvTXpzluDfqhCMBbpPz3m7XrfSJK7LwlFzw1DWi0jHTCeVM_rEkriXycKmRdGgCnMVQEhb8FVBnl_kwC5v68NJhIJKBZW0Mxxvi2hCPUzaJcQ3lxK_9Ge2ZydjbzB6I_KhdPRl1LN3rWk7YJxheaOQqay007MVlrgEBt6biKXv-yU8PLY_iNmT--_06iRiD53NBQ-60sHrkb_g3IM4o8cLW5dIk_jTNMA0DrtaicNM5Fmia6JiRFS61D9YpZkbO5QaOCkdEu9ZbIRmY6fN8Ikp5koaEattehuDAgF0sfBSnw89ufIQ"
client = KGClient(personal_token, host="core.kg.ebrains.eu")

DS_ID = '4e07beb1-1559-4c04-b4cd-a11512316103'

DSV_ID = 'd5088e83-cbf1-4ea2-b64c-b10778121b4e'
# '8f1f65bb-44cb-4312-afd4-10f623f929b8'  # Signy
DSV_release = '724d4af0-fe28-4032-8837-120b0d64a81c'


DS = Dataset.from_id(DS_ID, client, scope="released")
# data_types = DS.data_types.resolve(client)
# print(data_types)
# print(DS.has_versions)
# print(DS)
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
