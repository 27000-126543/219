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
  DatePicker,
  Input,
  Select,
  Row,
  Col,
  Descriptions,
} from 'antd';
import {
  PlusOutlined,
  ScheduleOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useStore } from '../store/useStore';
import { scheduleApi, liveApi } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const ScheduleChanges = () => {
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [changes, setChanges] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [createModal, setCreateModal] = useState(false);
  const [reviewModal, setReviewModal] = useState(false);
  const [selectedChange, setSelectedChange] = useState<any>(null);
  const [form] = Form.useForm();
  const [reviewForm] = Form.useForm();

  const isTeacher = user?.role === 'TEACHER';
  const isAdmin = user?.role === 'ADMIN';
  const isPrincipal = user?.role === 'PRINCIPAL';
  const canCreate = isTeacher;
  const canReview = isAdmin || isPrincipal;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const changesRes = await scheduleApi.getScheduleChanges();
      if (changesRes.data.success) {
        setChanges(changesRes.data.data);
      }

      if (canCreate) {
        const sessionsRes = await liveApi.getLiveSessions();
        if (sessionsRes.data.success) {
          setSessions(sessionsRes.data.data.filter((s: any) => s.status === 'SCHEDULED'));
        }
      }
    } catch (error) {
      console.error('Load schedule changes failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChange = async (values: any) => {
    try {
      const data = {
        ...values,
        newStartTime: values.newTimeRange[0].toISOString(),
        newEndTime: values.newTimeRange[1].toISOString(),
      };
      delete data.newTimeRange;
      const res = await scheduleApi.createScheduleChange(data);
      if (res.data.success) {
        message.success('调课申请提交成功');
        setCreateModal(false);
        form.resetFields();
        loadData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '提交失败');
    }
  };

  const handleReview = (change: any) => {
    setSelectedChange(change);
    setReviewModal(true);
  };

  const handleReviewSubmit = async (values: any) => {
    try {
      const res = await scheduleApi.reviewScheduleChange(selectedChange.id, values);
      if (res.data.success) {
        message.success('审核成功');
        setReviewModal(false);
        reviewForm.resetFields();
        loadData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '审核失败');
    }
  };

  const statusColors: Record<string, string> = {
    PENDING: 'orange',
    APPROVED: 'green',
    REJECTED: 'red',
    CANCELLED: 'default',
  };

  const statusLabels: Record<string, string> = {
    PENDING: '待审核',
    APPROVED: '已通过',
    REJECTED: '已拒绝',
    CANCELLED: '已取消',
  };

  const columns = [
    {
      title: '申请标题',
      dataIndex: 'reason',
      key: 'reason',
      render: (text: string) => (
        <Space>
          <ScheduleOutlined />
          <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {text}
          </span>
        </Space>
      ),
    },
    {
      title: '申请人',
      key: 'applicant',
      render: (_: any, record: any) => record.applicant?.realName || '-',
    },
    {
      title: '原时间',
      key: 'originalTime',
      render: (_: any, record: any) => (
        <div>
          <div>{record.originalStartTime ? dayjs(record.originalStartTime).format('YYYY-MM-DD HH:mm') : '-'}</div>
        </div>
      ),
    },
    {
      title: '新时间',
      key: 'newTime',
      render: (_: any, record: any) => (
        <div>
          <div>{record.newStartTime ? dayjs(record.newStartTime).format('YYYY-MM-DD HH:mm') : '-'}</div>
        </div>
      ),
    },
    {
      title: '教室',
      dataIndex: 'classroom',
      key: 'classroom',
      render: (text: string) => text || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
      ),
    },
    {
      title: '申请时间',
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
              Modal.info({
                title: '调课详情',
                width: 600,
                content: (
                  <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="申请人">{record.applicant?.realName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="申请原因">{record.reason}</Descriptions.Item>
                    <Descriptions.Item label="原时间">
                      {record.originalStartTime ? dayjs(record.originalStartTime).format('YYYY-MM-DD HH:mm') : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="新时间">
                      {record.newStartTime ? dayjs(record.newStartTime).format('YYYY-MM-DD HH:mm') : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="教室">{record.classroom || '-'}</Descriptions.Item>
                    <Descriptions.Item label="状态">{statusLabels[record.status]}</Descriptions.Item>
                    {record.reviewNote && (
                      <Descriptions.Item label="审核意见">{record.reviewNote}</Descriptions.Item>
                    )}
                  </Descriptions>
                ),
              });
            }}
          >
            详情
          </Button>
          {canReview && record.status === 'PENDING' && (
            <>
              <Button
                type="link"
                icon={<CheckOutlined />}
                onClick={() => handleReview(record)}
              >
                审核
              </Button>
            </>
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>调课管理</Title>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
            申请调课
          </Button>
        )}
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#faad14' }}>
                {changes.filter(c => c.status === 'PENDING').length}
              </div>
              <div style={{ color: '#999' }}>待审核</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#52c41a' }}>
                {changes.filter(c => c.status === 'APPROVED').length}
              </div>
              <div style={{ color: '#999' }}>已通过</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#ff4d4f' }}>
                {changes.filter(c => c.status === 'REJECTED').length}
              </div>
              <div style={{ color: '#999' }}>已拒绝</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1890ff' }}>
                {changes.length}
              </div>
              <div style={{ color: '#999' }}>总申请</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={changes}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="申请调课"
        open={createModal}
        onCancel={() => setCreateModal(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateChange}>
          <Form.Item name="sessionId" label="选择课程" rules={[{ required: true }]}>
            <Select placeholder="请选择要调课的直播课">
              {sessions.map((s) => (
                <Option key={s.id} value={s.id}>
                  {s.title} - {dayjs(s.startTime).format('YYYY-MM-DD HH:mm')}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="newTimeRange" label="新上课时间" rules={[{ required: true }]}>
            <RangePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item name="classroom" label="教室">
            <Input placeholder="请输入教室（可选）" />
          </Form.Item>
          <Form.Item name="reason" label="调课原因" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="请详细说明调课原因..." />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              提交申请
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="审核调课申请"
        open={reviewModal}
        onCancel={() => setReviewModal(false)}
        footer={null}
        width={600}
      >
        {selectedChange && (
          <div>
            <div style={{ marginBottom: 16, padding: 12, background: '#e6f7ff', borderRadius: 4 }}>
              <p style={{ margin: 0 }}><strong>申请人：</strong>{selectedChange.applicant?.realName}</p>
              <p style={{ margin: '4px 0 0 0' }}><strong>调课原因：</strong>{selectedChange.reason}</p>
              <p style={{ margin: '4px 0 0 0' }}>
                <strong>原时间：</strong>
                {selectedChange.originalStartTime ? dayjs(selectedChange.originalStartTime).format('YYYY-MM-DD HH:mm') : '-'}
              </p>
              <p style={{ margin: '4px 0 0 0' }}>
                <strong>新时间：</strong>
                {selectedChange.newStartTime ? dayjs(selectedChange.newStartTime).format('YYYY-MM-DD HH:mm') : '-'}
              </p>
            </div>
            <Form form={reviewForm} layout="vertical" onFinish={handleReviewSubmit}>
              <Form.Item name="status" label="审核结果" rules={[{ required: true }]}>
                <Select>
                  <Option value="APPROVED">通过</Option>
                  <Option value="REJECTED">拒绝</Option>
                </Select>
              </Form.Item>
              <Form.Item name="reviewNote" label="审核意见">
                <TextArea rows={3} placeholder="请输入审核意见（可选）" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" block>
                  提交审核
                </Button>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ScheduleChanges;
