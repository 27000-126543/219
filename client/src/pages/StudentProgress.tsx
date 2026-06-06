import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Spin,
  Select,
  Avatar,
  Descriptions,
  Tabs,
  Empty,
  Tag,
  Space,
  Progress,
} from 'antd';
import {
  UserOutlined,
  LineChartOutlined,
  RiseOutlined,
  TrophyOutlined,
  BookOutlined,
  ClockCircleOutlined,
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
import { useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { assignmentApi } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const StudentProgress = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>('MONTH');
  const [progressData, setProgressData] = useState<any>({});

  useEffect(() => {
    loadData();
  }, [studentId, timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (studentId) {
        const res = await assignmentApi.getStudentProgress(studentId, { timeRange });
        if (res.data.success) {
          setProgressData(res.data.data || {});
        }
      }
    } catch (error) {
      console.error('Load progress failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const weekData = [
    { name: '第1周', score: 75, classAvg: 72 },
    { name: '第2周', score: 78, classAvg: 74 },
    { name: '第3周', score: 82, classAvg: 76 },
    { name: '第4周', score: 85, classAvg: 78 },
  ];

  const monthData = [
    { name: '1月', score: 70, classAvg: 68 },
    { name: '2月', score: 75, classAvg: 72 },
    { name: '3月', score: 80, classAvg: 75 },
    { name: '4月', score: 85, classAvg: 78 },
    { name: '5月', score: 88, classAvg: 80 },
    { name: '6月', score: 92, classAvg: 82 },
  ];

  const semesterData = [
    { name: '第1月', score: 65, classAvg: 63 },
    { name: '第2月', score: 72, classAvg: 68 },
    { name: '第3月', score: 78, classAvg: 73 },
    { name: '第4月', score: 83, classAvg: 77 },
    { name: '第5月', score: 88, classAvg: 80 },
    { name: '第6月', score: 93, classAvg: 83 },
  ];

  const chartData = timeRange === 'WEEK' ? weekData : timeRange === 'MONTH' ? monthData : semesterData;

  const recentAssignments = [
    { id: 1, title: '钢琴基础练习-第5课', score: 92, totalScore: 100, submittedAt: '2024-01-15' },
    { id: 2, title: '乐理知识测试', score: 88, totalScore: 100, submittedAt: '2024-01-12' },
    { id: 3, title: '曲目演奏作业', score: 95, totalScore: 100, submittedAt: '2024-01-10' },
    { id: 4, title: '视唱练耳练习', score: 85, totalScore: 100, submittedAt: '2024-01-08' },
    { id: 5, title: '和弦识别作业', score: 90, totalScore: 100, submittedAt: '2024-01-05' },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  const studentInfo = progressData.student || user?.studentProfile;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <LineChartOutlined /> 学生成长档案
        </Title>
        <Select
          style={{ width: 150 }}
          value={timeRange}
          onChange={setTimeRange}
        >
          <Option value="WEEK">周视图</Option>
          <Option value="MONTH">月视图</Option>
          <Option value="SEMESTER">学期视图</Option>
        </Select>
      </div>

      <Card className="card-shadow" style={{ marginBottom: 16 }}>
        <Row gutter={24}>
          <Col span={4} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Avatar size={80} icon={<UserOutlined />} src={user?.avatar} />
          </Col>
          <Col span={20}>
            <Descriptions column={4} bordered size="small">
              <Descriptions.Item label="学生姓名">{user?.realName || '学生姓名'}</Descriptions.Item>
              <Descriptions.Item label="学号">{studentInfo?.studentId || 'S2024001'}</Descriptions.Item>
              <Descriptions.Item label="年龄">{studentInfo?.age || 10}岁</Descriptions.Item>
              <Descriptions.Item label="年级">{studentInfo?.grade || '四年级'}</Descriptions.Item>
              <Descriptions.Item label="所学课程">钢琴、声乐</Descriptions.Item>
              <Descriptions.Item label="入学时间">2023-09-01</Descriptions.Item>
              <Descriptions.Item label="测评成绩">{studentInfo?.assessmentScore || 85}分</Descriptions.Item>
              <Descriptions.Item label="当前平均分">
                <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                  {studentInfo?.averageScore || 88}分
                </span>
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: '#999', marginBottom: 8 }}>当前平均分</div>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#1890ff' }}>
                {studentInfo?.averageScore || 88}
              </div>
              <div style={{ color: '#52c41a', fontSize: 12, marginTop: 4 }}>
                <RiseOutlined /> 较上月提升 5%
              </div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: '#999', marginBottom: 8 }}>完成作业数</div>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#52c41a' }}>
                {progressData.completedAssignments || 42}
              </div>
              <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                共 {progressData.totalAssignments || 45} 次作业
              </div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: '#999', marginBottom: 8 }}>到课率</div>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#722ed1' }}>
                {progressData.attendanceRate || 95}%
              </div>
              <Progress percent={progressData.attendanceRate || 95} showInfo={false} />
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: '#999', marginBottom: 8 }}>班级排名</div>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#faad14' }}>
                <TrophyOutlined /> {progressData.classRank || 3}
              </div>
              <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                共 {progressData.classTotal || 25} 人
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="score">
        <TabPane tab="成绩趋势" key="score">
          <Card title="成绩变化曲线图" className="card-shadow">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="score"
                  name="学生成绩"
                  stroke="#1890ff"
                  strokeWidth={3}
                  dot={{ r: 6 }}
                  activeDot={{ r: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="classAvg"
                  name="班级平均"
                  stroke="#8c8c8c"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabPane>

        <TabPane tab="能力雷达" key="ability">
          <Card title="各项能力得分" className="card-shadow">
            <Row gutter={16}>
              <Col span={8}>
                <Card size="small" title="乐理知识">
                  <Progress percent={85} strokeColor={{ from: '#108ee9', to: '#87d068' }} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" title="演奏技巧">
                  <Progress percent={90} strokeColor={{ from: '#108ee9', to: '#87d068' }} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" title="视唱练耳">
                  <Progress percent={78} strokeColor={{ from: '#108ee9', to: '#87d068' }} />
                </Card>
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={8}>
                <Card size="small" title="节奏感">
                  <Progress percent={88} strokeColor={{ from: '#108ee9', to: '#87d068' }} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" title="表现力">
                  <Progress percent={82} strokeColor={{ from: '#108ee9', to: '#87d068' }} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" title="音乐素养">
                  <Progress percent={80} strokeColor={{ from: '#108ee9', to: '#87d068' }} />
                </Card>
              </Col>
            </Row>
          </Card>
        </TabPane>

        <TabPane tab="最近作业" key="assignments">
          <Card title="最近作业完成情况" className="card-shadow">
            {recentAssignments.map((item) => (
              <Card key={item.id} size="small" style={{ marginBottom: 8 }}>
                <Row align="middle">
                  <Col span={12}>
                    <Space>
                      <BookOutlined />
                      <span>{item.title}</span>
                    </Space>
                  </Col>
                  <Col span={6}>
                    <Space>
                      <ClockCircleOutlined style={{ color: '#999' }} />
                      <span style={{ color: '#999', fontSize: 12 }}>{item.submittedAt}</span>
                    </Space>
                  </Col>
                  <Col span={6} style={{ textAlign: 'right' }}>
                    <Tag color={item.score >= 90 ? 'green' : item.score >= 80 ? 'blue' : 'orange'}>
                      {item.score}/{item.totalScore}分
                    </Tag>
                  </Col>
                </Row>
              </Card>
            ))}
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default StudentProgress;
