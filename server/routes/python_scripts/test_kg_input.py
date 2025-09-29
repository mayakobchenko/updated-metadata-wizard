from fairgraph.openminds.controlledterms import SemanticDataType
import fairgraph
from fairgraph import KGClient
from fairgraph.openminds.core import DatasetVersion
from fairgraph.openminds.core import Dataset

personal_token = "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJLYU01NTRCM2RmMHBIamZYWi1aRl94bUUwMThPS1R0RkNjMjR3aVVqQmFvIn0.eyJleHAiOjE3NTg3MTU0MTAsImlhdCI6MTc1ODcxMzYxMCwiYXV0aF90aW1lIjoxNzU4MjY5MjA1LCJqdGkiOiIxMzNkYjIxZS0xN2ExLTQ0ZDQtOTg0My1mZGIyNWQyYjExMWUiLCJpc3MiOiJodHRwczovL2lhbS5lYnJhaW5zLmV1L2F1dGgvcmVhbG1zL2hicCIsImF1ZCI6WyJ4d2lraSIsInRlYW0iLCJncm91cCJdLCJzdWIiOiI3YWVjMmJmMi04MmM4LTQwYzEtYmQ2NC0xNzNjYWJjZmQ4NDIiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJrZyIsInNpZCI6ImY4NmFjZmVjLTZkNDctNDYxOS1hM2QwLTdiZjE0OTYxZjFjYSIsInNjb3BlIjoicHJvZmlsZSByb2xlcyBlbWFpbCBvcGVuaWQgZ3JvdXAgY2xiLndpa2kucmVhZCB0ZWFtIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJNYXlhIEtvYmNoZW5rbyIsIm1pdHJlaWQtc3ViIjoiMjM4MDk0NjMyOTI1NTYxNiIsInByZWZlcnJlZF91c2VybmFtZSI6Im1heWFrb2JjaGVua28iLCJnaXZlbl9uYW1lIjoiTWF5YSIsImZhbWlseV9uYW1lIjoiS29iY2hlbmtvIiwiZW1haWwiOiJtYXlhLmtvYmNoZW5rb0BtZWRpc2luLnVpby5ubyJ9.PyVoQo0XCizulnVmYtteoFRE1lSgTHaBVIhBTiziU1LzA_pWCw3RKt0BX2TGia0h7t475eIbhotC-LqlpxT3H1eH1PWtR2A5TYhtjIPbqRa_S0KpcOo2MUVWnk9qNXAYbd1rdn_FlPYeA9hwCyTR3wNgY5fp_jSCkwy1D9MzyejqVxT1HXPWKFIldBzyq7wvNgN4dBltZfyReTDZft1mkntJzEztPhFhIT8DU2Qx3I_2kIZxzVRIBcxiR2C0HC5Mps8HIokCzpOKZssBR1kS8DEcT6s9wwDMVs9jVb3s8ayHA5sZYSTztrswV4PVV5K2Uu5C9p8ZM2VHuO31IyQ4xA"
DSV_ID = '724d4af0-fe28-4032-8837-120b0d64a81c'
client = KGClient(personal_token, host="core.kg.ebrains.eu")

data_types_list = SemanticDataType.list(
    client, size=100, from_index=0, api='auto', scope='released', resolved=False, space=None)

for item in data_types_list:
    print(item.name)

DSV = DatasetVersion.from_id(DSV_ID, client, scope="in progress")

data = ["Experimental data", "Raw data"]
types = []
for i in range(len(data)):
    # print(data[i])
    # print(type(data[i]))
    types = SemanticDataType.by_name(data[i], client)
    # print(types)


# print(SemanticDataType.by_name("Experimental data", client))
ex_type = SemanticDataType.by_name("Experimental data", client)
DSV.data_types = ex_type
DSV.save(client)
print(DSV.data_types.resolve(client))

# DSV.data_types = types
# DSV.save(client)

# DSV.data_types = SemanticDataType(name=data[i])
# DSV.save(client)

# DSV.data_types = [SemanticDataType(name=item) for item in data]
# for i in range(len(data)):
#    DSV.data_types = SemanticDataType(name=data[i])


# DSV.save(client)
# print(DSV.data_types.resolve(client))

# DSV.data_types = SemanticDataType(name='raw data')

# DSV.data_types = [SemanticDataType(name=item) for item in data]
# DSV.data_types = SemanticDataType(name='raw data')
