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
  InputNumber,
  Progress,
} from 'antd';
import {
  PlusOutlined,
  FileSearchOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useStore } from '../store/useStore';
import { examApi, classApi } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const Exams = () => {
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [createModal, setCreateModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [form] = Form.useForm();

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
      const examsRes = await examApi.getExams();
      if (examsRes.data.success) {
        setExams(examsRes.data.data);
      }

      if (canCreate) {
        const classesRes = await classApi.getClasses();
        if (classesRes.data.success) {
          setClasses(classesRes.data.data);
        }
      }
    } catch (error) {
      console.error('Load exams failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = async (values: any) => {
    try {
      const data = {
        ...values,
        startTime: values.timeRange[0].toISOString(),
        endTime: values.timeRange[1].toISOString(),
      };
      delete data.timeRange;
      const res = await examApi.createExam(data);
      if (res.data.success) {
        message.success('考试创建成功');
        setCreateModal(false);
        form.resetFields();
        loadData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '创建失败');
    }
  };

  const handleViewDetail = (exam: any) => {
    setSelectedExam(exam);
    setDetailModal(true);
  };

  const handlePublish = async (id: string) => {
    try {
      const res = await examApi.publishExam(id);
      if (res.data.success) {
        message.success('考试已发布');
        loadData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '发布失败');
    }
  };

  const statusColors: Record<string, string> = {
    DRAFT: 'default',
    PUBLISHED: 'blue',
    ONGOING: 'green',
    COMPLETED: 'gray',
    GRADED: 'purple',
  };

  const statusLabels: Record<string, string> = {
    DRAFT: '草稿',
    PUBLISHED: '已发布',
    ONGOING: '进行中',
    COMPLETED: '已结束',
    GRADED: '已批改',
  };

  const columns = [
    {
      title: '考试名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <Space>
          <FileSearchOutlined />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '考试类型',
      dataIndex: 'examType',
      key: 'examType',
      render: (type: string) => <Tag color="purple">{type}</Tag>,
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
      title: '考试时间',
      key: 'time',
      render: (_: any, record: any) => (
        <div>
          <div>{dayjs(record.startTime).format('YYYY-MM-DD HH:mm')}</div>
          <div style={{ color: '#999', fontSize: 12 }}>
            至 {dayjs(record.endTime).format('HH:mm')}
          </div>
        </div>
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
      title: '统计',
      key: 'stats',
      render: (_: any, record: any) => {
        if (record.statistics) {
          return (
            <Space>
              <span>平均分: {record.statistics.avgScore || '-'}</span>
              <span>及格率: {record.statistics.passRate ? `${record.statistics.passRate}%` : '-'}</span>
            </Space>
          );
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
          {record.status === 'DRAFT' && canCreate && (
            <Button
              type="link"
              onClick={() => handlePublish(record.id)}
            >
              发布
            </Button>
          )}
          {record.status === 'ONGOING' && isStudent && (
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
            >
              开始考试
            </Button>
          )}
          {record.status === 'GRADED' && (
            <Button
              type="link"
              icon={<BarChartOutlined />}
            >
              查看统计
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
        <Title level={3} style={{ margin: 0 }}>考试管理</Title>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
            创建考试
          </Button>
        )}
      </div>

      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={exams}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="创建考试"
        open={createModal}
        onCancel={() => setCreateModal(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateExam}>
          <Form.Item name="classId" label="所属班级" rules={[{ required: true }]}>
            <Select placeholder="请选择班级">
              {classes.map((c) => (
                <Option key={c.id} value={c.id}>{c.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="name" label="考试名称" rules={[{ required: true }]}>
                <Input placeholder="请输入考试名称" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="examType" label="考试类型" initialValue="阶段测试" rules={[{ required: true }]}>
                <Select>
                  <Option value="阶段测试">阶段测试</Option>
                  <Option value="期中考试">期中考试</Option>
                  <Option value="期末考试">期末考试</Option>
                  <Option value="模拟考试">模拟考试</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="考试说明">
            <TextArea rows={3} placeholder="请输入考试说明" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="totalScore" label="总分" initialValue={100} rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1} max={1000} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="timeRange" label="考试时间" rules={[{ required: true }]}>
                <RangePicker
                  showTime={{ format: 'HH:mm' }}
                  format="YYYY-MM-DD HH:mm"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              创建考试
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="考试详情"
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModal(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {selectedExam && (
          <div>
            <Title level={4}>{selectedExam.name}</Title>
            <Space style={{ marginBottom: 16 }} wrap>
              <Tag color="purple">{selectedExam.examType}</Tag>
              <Tag>总分：{selectedExam.totalScore}分</Tag>
              <Tag color={statusColors[selectedExam.status]}>{statusLabels[selectedExam.status]}</Tag>
              <Tag>
                <ClockCircleOutlined /> {dayjs(selectedExam.startTime).format('YYYY-MM-DD HH:mm')} - {dayjs(selectedExam.endTime).format('HH:mm')}
              </Tag>
            </Space>
            <p style={{ whiteSpace: 'pre-wrap' }}>{selectedExam.description}</p>

            {selectedExam.statistics && (
              <Card title="考试统计" size="small" style={{ marginTop: 16 }}>
                <Row gutter={16}>
                  <Col span={6}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                        {selectedExam.statistics.avgScore || '-'}
                      </div>
                      <div style={{ color: '#999' }}>平均分</div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                        {selectedExam.statistics.maxScore || '-'}
                      </div>
                      <div style={{ color: '#999' }}>最高分</div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>
                        {selectedExam.statistics.minScore || '-'}
                      </div>
                      <div style={{ color: '#999' }}>最低分</div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1' }}>
                        {selectedExam.statistics.passRate ? `${selectedExam.statistics.passRate}%` : '-'}
                      </div>
                      <div style={{ color: '#999' }}>及格率</div>
                    </div>
                  </Col>
                </Row>
                {selectedExam.statistics.suggestions && (
                  <div style={{ marginTop: 16, padding: 12, background: '#f6ffed', borderRadius: 4 }}>
                    <strong>教学改善建议：</strong>
                    <p style={{ margin: '8px 0 0 0' }}>{selectedExam.statistics.suggestions}</p>
                  </div>
                )}
              </Card>
            )}

            {selectedExam.questions && selectedExam.questions.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Title level={5}>题目列表</Title>
                {selectedExam.questions.map((q: any, idx: number) => (
                  <Card key={q.id} size="small" style={{ marginBottom: 8 }}>
                    <p><strong>第{idx + 1}题 ({q.score}分) - {q.questionType}</strong></p>
                    <p>{q.questionText}</p>
                    {q.options && (
                      <ul>
                        {Object.entries(q.options as Record<string, string>).map(([key, value]) => (
                          <li key={key}>{key}. {value}</li>
                        ))}
                      </ul>
                    )}
                    {selectedExam.statistics?.questionStats?.[q.id] && (
                      <Tag color="blue">
                        正确率: {selectedExam.statistics.questionStats[q.id].correctRate}%
                      </Tag>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Exams;
