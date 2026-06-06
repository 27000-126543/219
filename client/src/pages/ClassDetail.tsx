import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Spin,
  Descriptions,
  Tabs,
  Table,
  Tag,
  Button,
  Avatar,
  Space,
  Progress,
  List,
  Empty,
} from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  LineChartOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { classApi } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TabPane } = Tabs;

const ClassDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [classInfo, setClassInfo] = useState<any>({});
  const [statistics, setStatistics] = useState<any>({});
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([]);
  const [scoreTrend, setScoreTrend] = useState<any[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (id) {
        const classRes = await classApi.getClassById(id);
        if (classRes.data.success) {
          setClassInfo(classRes.data.data);
        }

        const statsRes = await classApi.getClassStatistics(id);
        if (statsRes.data.success) {
          const data = statsRes.data.data || {};
          setStatistics(data);
          setStudents(data.students || []);
          setAttendanceTrend(data.attendanceTrend || []);
          setScoreTrend(data.scoreTrend || []);
          setLiveSessions(data.liveSessions || []);
          setAssignments(data.assignments || []);
        }
      }
    } catch (error) {
      console.error('Load class detail failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const studentColumns = [
    {
      title: '学生',
      key: 'student',
      render: (_: any, record: any) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} src={record.avatar} />
          <div>
            <div>{record.name}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{record.studentId}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '到课率',
      dataIndex: 'attendanceRate',
      key: 'attendanceRate',
      render: (rate: number) => (
        <div>
          <Progress percent={rate} size="small" />
        </div>
      ),
    },
    {
      title: '平均分',
      dataIndex: 'avgScore',
      key: 'avgScore',
      render: (score: number) => (
        <span style={{ fontWeight: 'bold', color: score >= 90 ? '#52c41a' : score >= 80 ? '#1890ff' : '#faad14' }}>
          {score}分
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          normal: 'green',
          warning: 'orange',
          danger: 'red',
        };
        const labels: Record<string, string> = {
          normal: '正常',
          warning: '需关注',
          danger: '预警',
        };
        return <Tag color={colors[status]}>{labels[status]}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: any) => (
        <Button type="link" onClick={() => navigate(`/progress/${record.id}`)}>
          查看成长
        </Button>
      ),
    },
  ];

  const sessionStatusColors: Record<string, string> = {
    SCHEDULED: 'blue',
    LIVE: 'green',
    COMPLETED: 'gray',
    CANCELLED: 'red',
  };

  const sessionStatusLabels: Record<string, string> = {
    SCHEDULED: '待开始',
    LIVE: '直播中',
    COMPLETED: '已结束',
    CANCELLED: '已取消',
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/classes')}>
          返回班级列表
        </Button>
      </div>

      <Card className="card-shadow" style={{ marginBottom: 16 }}>
        <Row gutter={24}>
          <Col span={18}>
            <Title level={3} style={{ margin: '0 0 16px 0' }}>
              {classInfo.name || '钢琴基础A班'}
              <Tag color="blue" style={{ marginLeft: 12 }}>{classInfo.code || 'Piano-A-001'}</Tag>
            </Title>
            <Descriptions column={3} bordered size="small">
              <Descriptions.Item label="所属课程">{classInfo.course?.name || '钢琴基础课程'}</Descriptions.Item>
              <Descriptions.Item label="学科">{classInfo.subject?.name || '钢琴'}</Descriptions.Item>
              <Descriptions.Item label="授课教师">
                {classInfo.teacher?.user?.realName || '张老师'}
              </Descriptions.Item>
              <Descriptions.Item label="班主任">
                {classInfo.headTeacher?.realName || '李老师'}
              </Descriptions.Item>
              <Descriptions.Item label="学生人数">
                {classInfo.currentStudents || classInfo._count?.enrollments || 20} / {classInfo.maxStudents || 25}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={classInfo.status === 'ACTIVE' ? 'green' : 'orange'}>
                  {classInfo.status === 'ACTIVE' ? '招生中' : classInfo.status === 'FULL' ? '已满班' : '已结束'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="开始日期">
                {classInfo.startDate ? dayjs(classInfo.startDate).format('YYYY-MM-DD') : '2024-01-15'}
              </Descriptions.Item>
              <Descriptions.Item label="结束日期">
                {classInfo.endDate ? dayjs(classInfo.endDate).format('YYYY-MM-DD') : '2024-06-30'}
              </Descriptions.Item>
              <Descriptions.Item label="教室">{classInfo.classroom || '线上教室A'}</Descriptions.Item>
            </Descriptions>
          </Col>
          <Col span={6}>
            <Card size="small" title="班级数据概览">
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1890ff' }}>
                  {statistics.avgScore || 88}
                </div>
                <div style={{ color: '#999' }}>班级平均分</div>
              </div>
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 28, fontWeight: 'bold', color: '#52c41a' }}>
                  {statistics.attendanceRate || 92}%
                </div>
                <div style={{ color: '#999' }}>平均到课率</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 'bold', color: '#722ed1' }}>
                  {statistics.submissionRate || 90}%
                </div>
                <div style={{ color: '#999' }}>作业提交率</div>
              </div>
            </Card>
          </Col>
        </Row>
      </Card>

      <Tabs defaultActiveKey="students">
        <TabPane tab={<span><TeamOutlined /> 学生列表</span>} key="students">
          <Card className="card-shadow">
            <Table
              columns={studentColumns}
              dataSource={students}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>

        <TabPane tab={<span><LineChartOutlined /> 数据统计</span>} key="statistics">
          <Row gutter={16}>
            <Col span={12}>
              <Card title="到课率与作业提交率趋势" className="card-shadow">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={attendanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="attendance" name="到课率(%)" stroke="#1890ff" strokeWidth={2} />
                    <Line type="monotone" dataKey="submission" name="提交率(%)" stroke="#52c41a" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="班级成绩趋势" className="card-shadow">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={scoreTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="avgScore" name="平均分" stroke="#722ed1" fill="#722ed1" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="maxScore" name="最高分" stroke="#52c41a" fill="#52c41a" fillOpacity={0.1} />
                    <Area type="monotone" dataKey="minScore" name="最低分" stroke="#faad14" fill="#faad14" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab={<span><VideoCameraOutlined /> 直播课表</span>} key="sessions">
          <Card className="card-shadow">
            <List
              dataSource={liveSessions}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    item.status === 'SCHEDULED' ? (
                      <Button type="link" disabled>待开始</Button>
                    ) : item.status === 'LIVE' ? (
                      <Button type="primary" size="small">进入直播</Button>
                    ) : (
                      <Button type="link">查看回放</Button>
                    ),
                  ]}
                >
                  <List.Item.Meta
                    avatar={<VideoCameraOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                    title={
                      <Space>
                        <span>{item.title}</span>
                        <Tag color={sessionStatusColors[item.status]}>
                          {sessionStatusLabels[item.status]}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space>
                        <ClockCircleOutlined />
                        <span>{item.startTime} - {item.endTime.split(' ')[1]}</span>
                        {item.status === 'COMPLETED' && (
                          <span style={{ color: '#999' }}>签到: {item.attendance}人</span>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </TabPane>

        <TabPane tab={<span><FileTextOutlined /> 作业列表</span>} key="assignments">
          <Card className="card-shadow">
            <List
              dataSource={assignments}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<FileTextOutlined style={{ fontSize: 24, color: '#52c41a' }} />}
                    title={item.title}
                    description={
                      <Space>
                        <ClockCircleOutlined />
                        <span>截止: {item.dueDate}</span>
                        <span style={{ color: '#999' }}>
                          已提交: {item.submitted}/{item.total}
                        </span>
                        {item.avgScore > 0 && (
                          <span style={{ color: '#52c41a' }}>
                            平均分: {item.avgScore}分
                          </span>
                        )}
                      </Space>
                    }
                  />
                  <Progress
                    type="circle"
                    size="small"
                    percent={Math.round((item.submitted / item.total) * 100)}
                  />
                </List.Item>
              )}
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default ClassDetail;
