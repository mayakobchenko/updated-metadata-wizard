import { Form as AntForm, Input, Space, Row, Col, Button } from 'antd';
import { useEffect, useState } from 'react';

export default function Dataset2({ form, onChange, data }) {
  const initialValues = {
    dataset2: {
      Data2UrlDoiRepo: data.dataset2?.Data2UrlDoiRepo || '',
      Data2DoiJournal: data.dataset2?.Data2DoiJournal || '',
      homePage: data.dataset2?.homePage || '',
      supportChannels: data.dataset2?.supportChannels || [],
    }
  };

  const [channelFields, setChannelFields] = useState([{ idChannel: Date.now(), value: '' }]);

  useEffect(() => {
    if (data.dataset2.supportChannels) {
      setChannelFields(data.dataset2.supportChannels.map((channel) => ({
        idChannel: channel.idChannel,
        value: channel.value || '',
      })));
    }
  }, [data.dataset2.supportChannels]);

  // Handle input changes for channels
  const handleChannelChange = (index, value) => {
    const newChannels = [...channelFields];
    newChannels[index].value = value;
    setChannelFields(newChannels);
    onChange({ dataset2: { ...data.dataset2, supportChannels: newChannels } }); // Update parent
  };

  const handleAddChannel = () => {
    setChannelFields([...channelFields, { idChannel: Date.now(), value: '' }]);
    onChange({ dataset2: { ...data.dataset2, supportChannels: [...channelFields, { idChannel: Date.now(), value: '' }] } });
  };

  const handleRemoveChannel = (idChannel) => {
    const newChannels = channelFields.filter(field => field.idChannel !== idChannel);
    setChannelFields(newChannels);
    onChange({ dataset2: { ...data.dataset2, supportChannels: newChannels } }); // Update parent
  };

  const handleValuesChange = (changedValues) => {
    // If other values are changed, update the parent as well
    onChange({ dataset2: { ...data.dataset2, ...changedValues.dataset2 } });
  };

  return (
    <div>
      <div><p className="step-title">Dataset part 2</p></div>
      <AntForm
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onValuesChange={handleValuesChange}
      >
        {data.dataset2?.Data2UrlDoiRepo ? (
          <AntForm.Item
            label="Has your data already been published elsewhere?"
            name={['dataset2', 'Data2UrlDoiRepo']}
            extra="Please state the DOI(s) or URL(s) to the data repository"
          >
            <Input />
          </AntForm.Item>
        ) : null}

        <AntForm.Item
          label="Home Page"
          name={['dataset2', 'homePage']}
          rules={[{ required: false }]}
          extra="Add the URL to the homepage describing this dataset (if applicable)"
        >
          <Input />
        </AntForm.Item>

        <Space direction="vertical" style={{ width: '100%' }}>
          {channelFields.map(({ idChannel, value }, index) => (
            <div key={idChannel}>
              <Row gutter={16} align="middle" style={{ width: '100%' }}>
                <Col flex="1 1 0">
                  <AntForm.Item
                    label="Support channel"
                    name={['dataset2', `supportChannel_${idChannel}`]}
                    extra="Enter all channels through which a user can receive support for handling this research product."
                  >
                    <Input
                      value={value}
                      onChange={(e) => handleChannelChange(index, e.target.value)}
                    />
                  </AntForm.Item>
                </Col>
                <Col>
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => handleRemoveChannel(idChannel)}
                  >
                    Remove Channel
                  </Button>
                </Col>
              </Row>
            </div>
          ))}
          <AntForm.Item>
            <Button type="primary" size="small" onClick={handleAddChannel}>Add Channel</Button>
          </AntForm.Item>
        </Space>

        <AntForm.Item
          label="Input data"
          name={['dataset2', 'inputdata']}
          rules={[{ required: false }]}
          extra="Add the data that was used as input for this dataset version."
        >
          <Input />
        </AntForm.Item>

        {data.dataset2?.Data2DoiJournal ? (
          <AntForm.Item
            label="Has your data already been described in a journal article?"
            name={['dataset2', 'Data2DoiJournal']}
            rules={[{ required: false }]}
            extra="Please state the DOI(s) of the journal article(s)"
          >
            <Input />
          </AntForm.Item>
        ) : null}

        <AntForm.Item
          label="Related Publications"
          name={['dataset2', 'publications']}
          rules={[{ required: false }]}
          extra={<>Please list DOIs of all related publications that report on the dataset itself.</>}
        >
          <Input />
        </AntForm.Item>
      </AntForm>
    </div>
  );
}
