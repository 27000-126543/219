import { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Tag,
  Button,
  Space,
  Typography,
  Spin,
  message,
  Modal,
  Form,
  Select,
  Input,
  Badge,
  Avatar,
  Row,
  Col,
} from 'antd';
import {
  WarningOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  UserOutlined,
  EyeOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { useStore } from '../store/useStore';
import { alertApi } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Alerts = () => {
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [handleModal, setHandleModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [form] = Form.useForm();

  const isHeadTeacher = user?.role === 'HEAD_TEACHER';
  const isAdmin = user?.role === 'ADMIN';
  const canHandle = isHeadTeacher || isAdmin;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await alertApi.getAlerts();
      if (res.data.success) {
        setAlerts(res.data.data);
      }
    } catch (error) {
      console.error('Load alerts failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHandle = (alert: any) => {
    setSelectedAlert(alert);
    setHandleModal(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      const res = await alertApi.handleAlert(selectedAlert.id, values);
      if (res.data.success) {
        message.success('处理成功');
        setHandleModal(false);
        form.resetFields();
        loadData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '处理失败');
    }
  };

  const typeColors: Record<string, string> = {
    ABSENTEEISM: 'red',
    SCORE_DROP: 'orange',
    BEHAVIOR: 'purple',
    OTHER: 'blue',
  };

  const typeLabels: Record<string, string> = {
    ABSENTEEISM: '缺勤预警',
    SCORE_DROP: '成绩下降',
    BEHAVIOR: '行为问题',
    OTHER: '其他预警',
  };

  const severityColors: Record<string, string> = {
    HIGH: 'red',
    MEDIUM: 'orange',
    LOW: 'blue',
  };

  const severityLabels: Record<string, string> = {
    HIGH: '高',
    MEDIUM: '中',
    LOW: '低',
  };

  const statusColors: Record<string, string> = {
    PENDING: 'red',
    HANDLED: 'orange',
    RESOLVED: 'green',
  };

  const statusLabels: Record<string, string> = {
    PENDING: '待处理',
    HANDLED: '处理中',
    RESOLVED: '已解决',
  };

  const columns = [
    {
      title: '预警类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string, record: any) => (
        <Space>
          <Badge color={severityColors[record.severity]} />
          <Tag color={typeColors[type]} icon={<WarningOutlined />}>
            {typeLabels[type]}
          </Tag>
        </Space>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '学生',
      key: 'student',
      render: (_: any, record: any) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <span>{record.student?.user?.realName || '未知'}</span>
        </Space>
      ),
    },
    {
      title: '班级',
      dataIndex: ['class', 'name'],
      key: 'class',
      render: (text: string) => text || '-',
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: string) => (
        <Tag color={severityColors[severity]}>{severityLabels[severity]}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status]}>
          {status === 'PENDING' && <ExclamationCircleOutlined />}
          {status === 'RESOLVED' && <CheckCircleOutlined />}
          {' '}{statusLabels[status]}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedAlert(record);
              Modal.info({
                title: '预警详情',
                width: 600,
                content: (
                  <div>
                    <p><strong>预警类型：</strong>{typeLabels[record.type]}</p>
                    <p><strong>标题：</strong>{record.title}</p>
                    <p><strong>描述：</strong>{record.description}</p>
                    <p><strong>严重程度：</strong>{severityLabels[record.severity]}</p>
                    <p><strong>状态：</strong>{statusLabels[record.status]}</p>
                    <p><strong>创建时间：</strong>{dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}</p>
                    {record.handlingNote && (
                      <p><strong>处理备注：</strong>{record.handlingNote}</p>
                    )}
                  </div>
                ),
              });
            }}
          >
            详情
          </Button>
          {canHandle && record.status !== 'RESOLVED' && (
            <Button
              type="link"
              icon={<MessageOutlined />}
              onClick={() => handleHandle(record)}
            >
              处理
            </Button>
          )}
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  const pendingCount = alerts.filter(a => a.status === 'PENDING').length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          预警中心
          {pendingCount > 0 && (
            <Badge count={pendingCount} style={{ marginLeft: 12 }} />
          )}
        </Title>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#ff4d4f' }}>
                {alerts.filter(a => a.severity === 'HIGH').length}
              </div>
              <div style={{ color: '#999' }}>高危预警</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#faad14' }}>
                {alerts.filter(a => a.severity === 'MEDIUM').length}
              </div>
              <div style={{ color: '#999' }}>中危预警</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#ff4d4f' }}>
                {alerts.filter(a => a.status === 'PENDING').length}
              </div>
              <div style={{ color: '#999' }}>待处理</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#52c41a' }}>
                {alerts.filter(a => a.status === 'RESOLVED').length}
              </div>
              <div style={{ color: '#999' }}>已解决</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={alerts}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="处理预警"
        open={handleModal}
        onCancel={() => setHandleModal(false)}
        footer={null}
        width={600}
      >
        {selectedAlert && (
          <div>
            <div style={{ marginBottom: 16, padding: 12, background: '#fff2e8', borderRadius: 4 }}>
              <p style={{ margin: 0 }}><strong>学生：</strong>{selectedAlert.student?.user?.realName}</p>
              <p style={{ margin: '4px 0 0 0' }}><strong>预警：</strong>{selectedAlert.title}</p>
              <p style={{ margin: '4px 0 0 0' }}><strong>描述：</strong>{selectedAlert.description}</p>
            </div>
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item name="status" label="处理状态" initialValue="HANDLED" rules={[{ required: true }]}>
                <Select>
                  <Option value="HANDLED">处理中</Option>
                  <Option value="RESOLVED">已解决</Option>
                </Select>
              </Form.Item>
              <Form.Item name="handlingNote" label="处理备注" rules={[{ required: true }]}>
                <TextArea rows={4} placeholder="请输入处理备注..." />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" block>
                  提交处理
                </Button>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Alerts;
