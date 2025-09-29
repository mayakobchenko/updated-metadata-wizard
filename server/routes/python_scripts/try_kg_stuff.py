import fairgraph
from fairgraph import KGClient
from fairgraph.openminds.core import DatasetVersion
from fairgraph.openminds.core import Dataset

personal_token = "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJLYU01NTRCM2RmMHBIamZYWi1aRl94bUUwMThPS1R0RkNjMjR3aVVqQmFvIn0.eyJleHAiOjE3NTg3MDk1MDgsImlhdCI6MTc1ODcwNzcwOCwiYXV0aF90aW1lIjoxNzU4MjY5MjA1LCJqdGkiOiJhYzJjZTdkZi1jZTExLTQxMjMtYTU4Ny00Mzg5ZDAzYjhlNWQiLCJpc3MiOiJodHRwczovL2lhbS5lYnJhaW5zLmV1L2F1dGgvcmVhbG1zL2hicCIsImF1ZCI6WyJ4d2lraSIsInRlYW0iLCJncm91cCJdLCJzdWIiOiI3YWVjMmJmMi04MmM4LTQwYzEtYmQ2NC0xNzNjYWJjZmQ4NDIiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJrZyIsInNpZCI6ImY4NmFjZmVjLTZkNDctNDYxOS1hM2QwLTdiZjE0OTYxZjFjYSIsInNjb3BlIjoicHJvZmlsZSByb2xlcyBlbWFpbCBvcGVuaWQgZ3JvdXAgY2xiLndpa2kucmVhZCB0ZWFtIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJNYXlhIEtvYmNoZW5rbyIsIm1pdHJlaWQtc3ViIjoiMjM4MDk0NjMyOTI1NTYxNiIsInByZWZlcnJlZF91c2VybmFtZSI6Im1heWFrb2JjaGVua28iLCJnaXZlbl9uYW1lIjoiTWF5YSIsImZhbWlseV9uYW1lIjoiS29iY2hlbmtvIiwiZW1haWwiOiJtYXlhLmtvYmNoZW5rb0BtZWRpc2luLnVpby5ubyJ9.VM4h4NchsPNS-gJTpfErSdftFjTbChjUx8dgnse2DGA71b3adX7OOcpTb6BJ4JllAyRnLa6dssaXQAGMpldVkbBobABlS3L7YEj_78osVSMa_Nj8gD2EdsRj6JJ2-CXe3sX0hQPFxdyuKOIAAekkR5HimHpVTVur3aBeO_e5ILnoXletrHUDVFV1QV3UYUq5aMe9DOOkHF153Kjfs5VFKD1TIt3zeq28UILdoZ34_zQMDfLl_rogce3kX4ZEbyft2eHn8RtkewpH9laxcG14YUG9mbHRzxUJj0zgOsFGgjVr9zljVQT-ERmrWiCPT-dTb4pM_lWjNlxpvW5Mwm-pXw"
client = KGClient(personal_token, host="core.kg.ebrains.eu")

DS_ID = '4e07beb1-1559-4c04-b4cd-a11512316103'

DS = Dataset.from_id(DS_ID, client, scope="released")
# data_types = DS.data_types.resolve(client)
# print(data_types)
print(DS.has_versions)


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

dsv_lsit = [dsv for dsv in dataset_example]
for dsv in dsv_lsit:
    print(dsv.name)

# print(dataset_example)
