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
  Select,
  Input,
  Modal,
  Form,
  DatePicker,
  Row,
  Col,
} from 'antd';
import { PlusOutlined, EyeOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { classApi, courseApi } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const Classes = () => {
  const navigate = useNavigate();
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [createModal, setCreateModal] = useState(false);
  const [form] = Form.useForm();

  const isAdmin = user?.role === 'ADMIN';
  const isStudent = user?.role === 'STUDENT';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      let classesRes;
      if (isStudent || user?.role === 'TEACHER' || user?.role === 'HEAD_TEACHER') {
        classesRes = await classApi.getMyClasses();
      } else {
        classesRes = await classApi.getClasses();
      }

      if (classesRes.data.success) {
        setClasses(classesRes.data.data);
      }

      if (isAdmin) {
        const coursesRes = await courseApi.getCourses();
        if (coursesRes.data.success) {
          setCourses(coursesRes.data.data);
        }
      }
    } catch (error) {
      console.error('Load classes failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (values: any) => {
    try {
      const data = {
        ...values,
        startDate: values.startDate?.toISOString(),
        endDate: values.endDate?.toISOString(),
      };
      const res = await classApi.createClass(data);
      if (res.data.success) {
        message.success('班级创建成功');
        setCreateModal(false);
        form.resetFields();
        loadData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '创建失败');
    }
  };

  const handleEnroll = async (classId: string) => {
    try {
      const res = await classApi.enrollClass(classId);
      if (res.data.success) {
        message.success(res.data.message || '报名成功');
        loadData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '报名失败');
    }
  };

  const handleDrop = async (classId: string) => {
    Modal.confirm({
      title: '确认退课',
      content: '确定要退出这个班级吗？',
      onOk: async () => {
        try {
          const res = await classApi.dropClass(classId);
          if (res.data.success) {
            message.success('退课成功');
            loadData();
          }
        } catch (error: any) {
          message.error(error.response?.data?.error || '退课失败');
        }
      },
    });
  };

  const statusColors: Record<string, string> = {
    ACTIVE: 'green',
    FULL: 'orange',
    COMPLETED: 'blue',
    CANCELLED: 'red',
  };

  const statusLabels: Record<string, string> = {
    ACTIVE: '招生中',
    FULL: '已满班',
    COMPLETED: '已结束',
    CANCELLED: '已取消',
  };

  const columns = [
    {
      title: '班级名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <Space>
          <span>{text}</span>
          <Tag color="blue">{record.code}</Tag>
        </Space>
      ),
    },
    {
      title: '课程',
      dataIndex: ['course', 'name'],
      key: 'course',
    },
    {
      title: '学科',
      dataIndex: ['subject', 'name'],
      key: 'subject',
      render: (text: string) => <Tag color="purple">{text}</Tag>,
    },
    {
      title: '授课教师',
      key: 'teacher',
      render: (_: any, record: any) => (
        <Space>
          <UserOutlined />
          <span>{record.teacher?.user?.realName || '待定'}</span>
        </Space>
      ),
    },
    {
      title: '人数',
      key: 'students',
      render: (_: any, record: any) => (
        <span>
          {record.currentStudents || record._count?.enrollments || 0} / {record.maxStudents}
        </span>
      ),
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
      title: '开始时间',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/classes/${record.id}`)}
          >
            详情
          </Button>
          {isStudent && record.status === 'ACTIVE' && (
            <Button type="link" onClick={() => handleEnroll(record.id)}>
              报名
            </Button>
          )}
          {isStudent && (
            <Button type="link" danger onClick={() => handleDrop(record.id)}>
              退课
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
        <Title level={3} style={{ margin: 0 }}>班级管理</Title>
        {isAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
            创建班级
          </Button>
        )}
      </div>

      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={classes}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="创建班级"
        open={createModal}
        onCancel={() => setCreateModal(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateClass}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="班级名称" rules={[{ required: true }]}>
                <Input placeholder="请输入班级名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="courseId" label="所属课程" rules={[{ required: true }]}>
                <Select placeholder="请选择课程">
                  {courses.map((c) => (
                    <Option key={c.id} value={c.id}>{c.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="maxStudents" label="最大人数" initialValue={20}>
                <Input type="number" placeholder="最大学生数" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="classroom" label="教室">
                <Input placeholder="教室名称" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="startDate" label="开始日期">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endDate" label="结束日期">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              创建班级
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Classes;
