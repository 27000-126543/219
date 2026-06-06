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
} from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  VideoCameraOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useStore } from '../store/useStore';
import { liveApi, classApi } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const LiveSessions = () => {
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [createModal, setCreateModal] = useState(false);
  const [form] = Form.useForm();

  const isTeacher = user?.role === 'TEACHER';
  const isAdmin = user?.role === 'ADMIN';
  const canCreate = isTeacher || isAdmin;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const sessionsRes = await liveApi.getLiveSessions();
      if (sessionsRes.data.success) {
        setSessions(sessionsRes.data.data);
      }

      if (canCreate) {
        const classesRes = await classApi.getClasses();
        if (classesRes.data.success) {
          setClasses(classesRes.data.data);
        }
      }
    } catch (error) {
      console.error('Load sessions failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (values: any) => {
    try {
      const data = {
        ...values,
        startTime: values.timeRange[0].toISOString(),
        endTime: values.timeRange[1].toISOString(),
      };
      delete data.timeRange;
      const res = await liveApi.createLiveSession(data);
      if (res.data.success) {
        message.success('直播课创建成功');
        setCreateModal(false);
        form.resetFields();
        loadData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '创建失败');
    }
  };

  const handleJoinSession = (session: any) => {
    if (session.streamUrl) {
      window.open(session.streamUrl, '_blank');
    } else {
      message.info('直播尚未开始');
    }
  };

  const statusColors: Record<string, string> = {
    SCHEDULED: 'blue',
    LIVE: 'green',
    COMPLETED: 'gray',
    CANCELLED: 'red',
    RESCHEDULED: 'orange',
  };

  const statusLabels: Record<string, string> = {
    SCHEDULED: '待开始',
    LIVE: '直播中',
    COMPLETED: '已结束',
    CANCELLED: '已取消',
    RESCHEDULED: '已调课',
  };

  const statusIcons: Record<string, any> = {
    SCHEDULED: <ClockCircleOutlined />,
    LIVE: <PlayCircleOutlined style={{ color: '#52c41a' }} />,
    COMPLETED: <CheckCircleOutlined />,
    CANCELLED: <CheckCircleOutlined />,
  };

  const columns = [
    {
      title: '课程标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: any) => (
        <Space>
          <VideoCameraOutlined />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '所属班级',
      dataIndex: ['class', 'name'],
      key: 'class',
      render: (text: string) => text || '-',
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      render: (time: string) => dayjs(time).format('HH:mm'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag icon={statusIcons[status]} color={statusColors[status]}>
          {statusLabels[status]}
        </Tag>
      ),
    },
    {
      title: '签到人数',
      dataIndex: 'attendanceCount',
      key: 'attendanceCount',
      render: (count: number) => count || 0,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          {record.status === 'LIVE' && (
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleJoinSession(record)}
            >
              进入直播
            </Button>
          )}
          {record.status === 'SCHEDULED' && (
            <Button size="small" disabled>
              待开始
            </Button>
          )}
          {record.status === 'COMPLETED' && (
            <Button size="small" disabled>
              已结束
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>直播课程</Title>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
            创建直播课
          </Button>
        )}
      </div>

      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={sessions}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="创建直播课"
        open={createModal}
        onCancel={() => setCreateModal(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateSession}>
          <Form.Item name="classId" label="所属班级" rules={[{ required: true }]}>
            <Select placeholder="请选择班级">
              {classes.map((c) => (
                <Option key={c.id} value={c.id}>{c.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="title" label="课程标题" rules={[{ required: true }]}>
            <Input placeholder="请输入课程标题" />
          </Form.Item>
          <Form.Item name="description" label="课程描述">
            <Input.TextArea rows={3} placeholder="请输入课程描述" />
          </Form.Item>
          <Form.Item name="timeRange" label="上课时间" rules={[{ required: true }]}>
            <RangePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              创建直播课
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LiveSessions;
