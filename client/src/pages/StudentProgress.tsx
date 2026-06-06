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
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentAssignments, setRecentAssignments] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [studentId, timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (studentId) {
        const res = await assignmentApi.getStudentProgress(studentId, { timeRange });
        if (res.data.success) {
          const data = res.data.data || {};
          setProgressData(data);
          setChartData(data.scoreTrend || []);
          setRecentAssignments(data.recentAssignments || []);
        }
      }
    } catch (error) {
      console.error('Load progress failed:', error);
    } finally {
      setLoading(false);
    }
  };

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
