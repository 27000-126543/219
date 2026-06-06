import { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Select,
  Input,
  Button,
  Tag,
  Typography,
  Spin,
  Empty,
  message,
  Space,
  Modal,
  Form,
} from 'antd';
import { SearchOutlined, FilterOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { courseApi, classApi } from '../services/api';
import { Course, Subject, CourseLevel } from '../types';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const Courses = () => {
  const navigate = useNavigate();
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filters, setFilters] = useState({
    subjectId: undefined as string | undefined,
    level: undefined as CourseLevel | undefined,
    search: '',
  });
  const [createModal, setCreateModal] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [coursesRes, subjectsRes] = await Promise.all([
        courseApi.getCourses(filters),
        courseApi.getSubjects(),
      ]);

      if (coursesRes.data.success) {
        setCourses(coursesRes.data.data);
      }
      if (subjectsRes.data.success) {
        setSubjects(subjectsRes.data.data);
      }
    } catch (error) {
      console.error('Load courses failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (classId: string) => {
    try {
      const res = await classApi.enrollClass(classId);
      if (res.data.success) {
        message.success(res.data.message || '报名成功');
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '报名失败');
    }
  };

  const handleCreateCourse = async (values: any) => {
    try {
      const res = await courseApi.createCourse(values);
      if (res.data.success) {
        message.success('课程创建成功');
        setCreateModal(false);
        form.resetFields();
        loadData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '创建失败');
    }
  };

  const levelOptions = [
    { value: 'BEGINNER', label: '初级' },
    { value: 'INTERMEDIATE', label: '中级' },
    { value: 'ADVANCED', label: '高级' },
    { value: 'PROFESSIONAL', label: '专业级' },
  ];

  const levelColors: Record<string, string> = {
    BEGINNER: 'green',
    INTERMEDIATE: 'blue',
    ADVANCED: 'orange',
    PROFESSIONAL: 'red',
  };

  const levelLabels: Record<string, string> = {
    BEGINNER: '初级',
    INTERMEDIATE: '中级',
    ADVANCED: '高级',
    PROFESSIONAL: '专业级',
  };

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'PRINCIPAL';
  const isStudent = user?.role === 'STUDENT';

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
        <Title level={3} style={{ margin: 0 }}>课程中心</Title>
        {isAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
            创建课程
          </Button>
        )}
      </div>

      <Card className="card-shadow" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Select
              placeholder="选择学科"
              style={{ width: '100%' }}
              allowClear
              value={filters.subjectId}
              onChange={(value) => setFilters({ ...filters, subjectId: value })}
            >
              {subjects.map((s) => (
                <Option key={s.id} value={s.id}>{s.name}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Select
              placeholder="选择难度"
              style={{ width: '100%' }}
              allowClear
              value={filters.level}
              onChange={(value) => setFilters({ ...filters, level: value })}
            >
              {levelOptions.map((o) => (
                <Option key={o.value} value={o.value}>{o.label}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8} md={10}>
            <Search
              placeholder="搜索课程名称"
              allowClear
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              onSearch={() => loadData()}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={24} md={2}>
            <Button type="primary" icon={<FilterOutlined />} onClick={loadData} block>
              筛选
            </Button>
          </Col>
        </Row>
      </Card>

      {courses.length > 0 ? (
        <Row gutter={[16, 16]}>
          {courses.map((course) => (
            <Col xs={24} sm={12} md={8} lg={6} key={course.id}>
              <Card
                hoverable
                className="card-shadow"
                actions={[
                  isStudent && course.classes && course.classes.length > 0 ? (
                    <Button type="link" onClick={() => handleEnroll(course.classes![0].id)}>
                      立即报名
                    </Button>
                  ) : null,
                ].filter(Boolean) as any}
              >
                <Card.Meta
                  title={
                    <Space>
                      <span>{course.name}</span>
                      <Tag color={levelColors[course.level]}>
                        {levelLabels[course.level]}
                      </Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <Text type="secondary">{course.subject?.name}</Text>
                      <br />
                      <Text type="secondary">
                        适合年龄：{course.minAge || 0} - {course.maxAge || 99}岁
                      </Text>
                      <br />
                      <Text type="secondary">
                        共 {course.totalSessions} 节课
                      </Text>
                      {course.description && (
                        <>
                          <br />
                          <Text ellipsis={true}>{course.description}</Text>
                        </>
                      )}
                    </div>
                  }
                />
                {course.teacher && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                    <Text type="secondary">授课教师：{course.teacher.user?.realName || '待定'}</Text>
                  </div>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Empty description="暂无课程" />
      )}

      <Modal
        title="创建课程"
        open={createModal}
        onCancel={() => setCreateModal(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateCourse}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="课程名称" rules={[{ required: true }]}>
                <Input placeholder="请输入课程名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="subjectId" label="所属学科" rules={[{ required: true }]}>
                <Select placeholder="请选择学科">
                  {subjects.map((s) => (
                    <Option key={s.id} value={s.id}>{s.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="level" label="难度级别" rules={[{ required: true }]}>
                <Select placeholder="请选择级别">
                  {levelOptions.map((o) => (
                    <Option key={o.value} value={o.value}>{o.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="totalSessions" label="总课时" rules={[{ required: true }]}>
                <Input type="number" placeholder="请输入总课时" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="minAge" label="最小年龄">
                <Input type="number" placeholder="最小年龄" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxAge" label="最大年龄">
                <Input type="number" placeholder="最大年龄" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="课程描述">
            <Input.TextArea rows={3} placeholder="请输入课程描述" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              创建课程
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Courses;
