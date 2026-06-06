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
  Upload,
  Progress,
  Row,
  Col,
  InputNumber,
} from 'antd';
import {
  PlusOutlined,
  FileTextOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { assignmentApi, classApi } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Assignments = () => {
  const navigate = useNavigate();
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [createModal, setCreateModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [submitModal, setSubmitModal] = useState(false);
  const [gradeModal, setGradeModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [form] = Form.useForm();
  const [submitForm] = Form.useForm();
  const [gradeForm] = Form.useForm();

  const isTeacher = user?.role === 'TEACHER';
  const isAdmin = user?.role === 'ADMIN';
  const isStudent = user?.role === 'STUDENT';
  const canCreate = isTeacher || isAdmin;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const assignmentsRes = await assignmentApi.getAssignments();
      if (assignmentsRes.data.success) {
        setAssignments(assignmentsRes.data.data);
      }

      if (canCreate) {
        const classesRes = await classApi.getClasses();
        if (classesRes.data.success) {
          setClasses(classesRes.data.data);
        }
      }
    } catch (error) {
      console.error('Load assignments failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (values: any) => {
    try {
      const data = {
        ...values,
        dueDate: values.dueDate?.toISOString(),
      };
      const res = await assignmentApi.createAssignment(data);
      if (res.data.success) {
        message.success('作业创建成功');
        setCreateModal(false);
        form.resetFields();
        loadData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '创建失败');
    }
  };

  const handleViewDetail = (assignment: any) => {
    setSelectedAssignment(assignment);
    setDetailModal(true);
  };

  const handleSubmitAssignment = (assignment: any) => {
    setSelectedAssignment(assignment);
    setSubmitModal(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      const formData = new FormData();
      if (values.content) {
        formData.append('content', values.content);
      }
      if (values.file && values.file[0]?.originFileObj) {
        formData.append('file', values.file[0].originFileObj);
      }
      const res = await assignmentApi.submitAssignment(selectedAssignment.id, formData);
      if (res.data.success) {
        message.success('作业提交成功');
        setSubmitModal(false);
        submitForm.resetFields();
        loadData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '提交失败');
    }
  };

  const handleGrade = (submission: any) => {
    setSelectedSubmission(submission);
    setGradeModal(true);
  };

  const handleGradeSubmit = async (values: any) => {
    try {
      const res = await assignmentApi.gradeAssignment(selectedSubmission.id, values);
      if (res.data.success) {
        message.success('批改成功');
        setGradeModal(false);
        gradeForm.resetFields();
        loadData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '批改失败');
    }
  };

  const typeLabels: Record<string, string> = {
    ONLINE: '在线作答',
    UPLOAD: '拍照上传',
    MIXED: '混合模式',
  };

  const typeColors: Record<string, string> = {
    ONLINE: 'blue',
    UPLOAD: 'green',
    MIXED: 'purple',
  };

  const submissionStatusLabels: Record<string, string> = {
    NOT_SUBMITTED: '未提交',
    SUBMITTED: '已提交',
    GRADED: '已批改',
    LATE: '迟交',
  };

  const submissionStatusColors: Record<string, string> = {
    NOT_SUBMITTED: 'default',
    SUBMITTED: 'processing',
    GRADED: 'success',
    LATE: 'warning',
  };

  const columns = [
    {
      title: '作业标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: any) => (
        <Space>
          <FileTextOutlined />
          <span>{text}</span>
          <Tag color={typeColors[record.type]}>{typeLabels[record.type]}</Tag>
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
      title: '总分',
      dataIndex: 'totalScore',
      key: 'totalScore',
    },
    {
      title: '截止时间',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '提交状态',
      key: 'submission',
      render: (_: any, record: any) => {
        if (isStudent) {
          const submission = record.submissions?.[0];
          const status = submission?.status || 'NOT_SUBMITTED';
          return (
            <Tag color={submissionStatusColors[status]}>
              {submissionStatusLabels[status]}
            </Tag>
          );
        }
        const submittedCount = record.submissions?.filter((s: any) => s.status !== 'NOT_SUBMITTED').length || 0;
        const totalCount = record.submissions?.length || 0;
        return (
          <Space>
            <Progress
              type="circle"
              size="small"
              percent={totalCount ? Math.round((submittedCount / totalCount) * 100) : 0}
            />
            <span>{submittedCount}/{totalCount}</span>
          </Space>
        );
      },
    },
    {
      title: '我的成绩',
      key: 'score',
      render: (_: any, record: any) => {
        if (isStudent) {
          const submission = record.submissions?.[0];
          if (submission?.status === 'GRADED') {
            return <span style={{ fontWeight: 'bold', color: '#52c41a' }}>{submission.totalScore}分</span>;
          }
          return '-';
        }
        return '-';
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {isStudent && record.submissions?.[0]?.status === 'NOT_SUBMITTED' && (
            <Button
              type="link"
              icon={<UploadOutlined />}
              onClick={() => handleSubmitAssignment(record)}
            >
              提交
            </Button>
          )}
          {isStudent && user?.studentProfile && (
            <Button
              type="link"
              onClick={() => navigate(`/progress/${user.studentProfile!.id}`)}
            >
              成长曲线
            </Button>
          )}
          {isTeacher && record.submissions?.map((s: any) => (
            s.status === 'SUBMITTED' && (
              <Button
                key={s.id}
                type="link"
                icon={<EditOutlined />}
                onClick={() => handleGrade(s)}
              >
                批改
              </Button>
            )
          ))}
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
        <Title level={3} style={{ margin: 0 }}>作业管理</Title>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
            创建作业
          </Button>
        )}
      </div>

      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={assignments}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="创建作业"
        open={createModal}
        onCancel={() => setCreateModal(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateAssignment}>
          <Form.Item name="classId" label="所属班级" rules={[{ required: true }]}>
            <Select placeholder="请选择班级">
              {classes.map((c) => (
                <Option key={c.id} value={c.id}>{c.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="title" label="作业标题" rules={[{ required: true }]}>
                <Input placeholder="请输入作业标题" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="type" label="作业类型" initialValue="ONLINE" rules={[{ required: true }]}>
                <Select>
                  <Option value="ONLINE">在线作答</Option>
                  <Option value="UPLOAD">拍照上传</Option>
                  <Option value="MIXED">混合模式</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="作业描述">
            <TextArea rows={3} placeholder="请输入作业描述" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="totalScore" label="总分" initialValue={100} rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1} max={1000} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dueDate" label="截止时间" rules={[{ required: true }]}>
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              创建作业
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="作业详情"
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModal(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {selectedAssignment && (
          <div>
            <Title level={4}>{selectedAssignment.title}</Title>
            <Space style={{ marginBottom: 16 }}>
              <Tag color={typeColors[selectedAssignment.type]}>{typeLabels[selectedAssignment.type]}</Tag>
              <Tag>总分：{selectedAssignment.totalScore}分</Tag>
              <Tag>
                <ClockCircleOutlined /> 截止：{dayjs(selectedAssignment.dueDate).format('YYYY-MM-DD HH:mm')}
              </Tag>
            </Space>
            <p style={{ whiteSpace: 'pre-wrap' }}>{selectedAssignment.description}</p>
            {selectedAssignment.questions && selectedAssignment.questions.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Title level={5}>题目列表</Title>
                {selectedAssignment.questions.map((q: any, idx: number) => (
                  <Card key={q.id} size="small" style={{ marginBottom: 8 }}>
                    <p><strong>第{idx + 1}题 ({q.score}分)</strong></p>
                    <p>{q.questionText}</p>
                    {q.options && (
                      <ul>
                        {Object.entries(q.options as Record<string, string>).map(([key, value]) => (
                          <li key={key}>{key}. {value}</li>
                        ))}
                      </ul>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="提交作业"
        open={submitModal}
        onCancel={() => setSubmitModal(false)}
        footer={null}
        width={600}
      >
        <Form form={submitForm} layout="vertical" onFinish={handleSubmit}>
          {selectedAssignment?.type !== 'UPLOAD' && (
            <Form.Item name="content" label="作答内容">
              <TextArea rows={10} placeholder="请输入你的答案" />
            </Form.Item>
          )}
          {selectedAssignment?.type !== 'ONLINE' && (
            <Form.Item name="file" label="上传附件">
              <Upload beforeUpload={() => false} maxCount={1}>
                <Button icon={<UploadOutlined />}>点击上传</Button>
              </Upload>
            </Form.Item>
          )}
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              提交作业
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="批改作业"
        open={gradeModal}
        onCancel={() => setGradeModal(false)}
        footer={null}
        width={600}
      >
        <Form form={gradeForm} layout="vertical" onFinish={handleGradeSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="subjectiveScore" label="主观题分数" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} max={selectedSubmission?.assignment?.totalScore || 100} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="feedback" label="评语">
            <TextArea rows={4} placeholder="请输入评语" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              提交批改
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Assignments;
