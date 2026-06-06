import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Spin,
  Table,
  Tag,
  Select,
  Tabs,
  Avatar,
  Button,
  Space,
} from 'antd';
import {
  BarChartOutlined,
  TrophyOutlined,
  UserOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  RiseOutlined,
  TeamOutlined,
  StarOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useStore } from '../store/useStore';
import { statisticsApi, courseApi } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const Statistics = () => {
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>({});
  const [performances, setPerformances] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [classData, setClassData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [selectedSubject]);

  const loadData = async () => {
    setLoading(true);
    try {
      const overviewRes = await statisticsApi.getOverview();
      if (overviewRes.data.success) {
        const data = overviewRes.data.data || {};
        setOverview(data.overview || {});
        setClassData(data.classStats || []);
        setPerformances(data.performances || []);
      }

      const subjectsRes = await courseApi.getSubjects();
      if (subjectsRes.data.success) {
        setSubjects(subjectsRes.data.data || []);
      }
    } catch (error) {
      console.error('Load statistics failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const performanceColumns = [
    {
      title: '排名',
      key: 'rank',
      width: 60,
      render: (_: any, record: any, index: number) => {
        const rank = record.rank || index + 1;
        if (rank === 1) return <TrophyOutlined style={{ color: '#faad14', fontSize: 20 }} />;
        if (rank === 2) return <TrophyOutlined style={{ color: '#d9d9d9', fontSize: 20 }} />;
        if (rank === 3) return <TrophyOutlined style={{ color: '#d48806', fontSize: 20 }} />;
        return <span style={{ fontWeight: 'bold' }}>{rank}</span>;
      },
    },
    {
      title: '教师',
      key: 'teacher',
      render: (_: any, record: any) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} src={record.teacher?.user?.avatar} />
          <span>{record.teacher?.user?.realName || '未知'}</span>
        </Space>
      ),
    },
    {
      title: '课时完成率',
      dataIndex: 'classCompletionRate',
      key: 'classCompletionRate',
      render: (rate: number) => (
        <span style={{ color: rate >= 95 ? '#52c41a' : rate >= 80 ? '#faad14' : '#ff4d4f' }}>
          {rate ? `${rate}%` : '-'}
        </span>
      ),
    },
    {
      title: '学员转化率',
      dataIndex: 'studentConversionRate',
      key: 'studentConversionRate',
      render: (rate: number) => <span>{rate ? `${rate}%` : '-'}</span>,
    },
    {
      title: '退费比例',
      dataIndex: 'refundRate',
      key: 'refundRate',
      render: (rate: number) => (
        <span style={{ color: rate && rate > 5 ? '#ff4d4f' : '#52c41a' }}>
          {rate ? `${rate}%` : '-'}
        </span>
      ),
    },
    {
      title: '满意度',
      dataIndex: 'avgSatisfaction',
      key: 'avgSatisfaction',
      render: (score: number) => (
        <Space>
          <StarOutlined style={{ color: '#faad14' }} />
          <span>{score || '-'}</span>
        </Space>
      ),
    },
    {
      title: '平均分',
      dataIndex: 'avgScore',
      key: 'avgScore',
      render: (score: number) => score || '-',
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
        <Title level={3} style={{ margin: 0 }}>
          <BarChartOutlined /> 数据统计
        </Title>
        <Space>
          <Select
            style={{ width: 150 }}
            value={selectedSubject}
            onChange={setSelectedSubject}
            placeholder="选择学科"
          >
            <Option value="ALL">全部学科</Option>
            {subjects.map((s) => (
              <Option key={s.id} value={s.id}>{s.name}</Option>
            ))}
          </Select>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, color: '#999', marginBottom: 8 }}>总学员数</div>
                <div style={{ fontSize: 28, fontWeight: 'bold' }}>{overview.totalStudents || 256}</div>
                <div style={{ color: '#52c41a', fontSize: 12, marginTop: 4 }}>
                  <ArrowUpOutlined /> 较上月增长 12%
                </div>
              </div>
              <Avatar size={48} style={{ backgroundColor: '#e6f7ff', color: '#1890ff' }} icon={<TeamOutlined />} />
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, color: '#999', marginBottom: 8 }}>总班级数</div>
                <div style={{ fontSize: 28, fontWeight: 'bold' }}>{overview.totalClasses || 32}</div>
                <div style={{ color: '#52c41a', fontSize: 12, marginTop: 4 }}>
                  <ArrowUpOutlined /> 较上月增长 8%
                </div>
              </div>
              <Avatar size={48} style={{ backgroundColor: '#f6ffed', color: '#52c41a' }} icon={<TeamOutlined />} />
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, color: '#999', marginBottom: 8 }}>平均续报率</div>
                <div style={{ fontSize: 28, fontWeight: 'bold' }}>{overview.avgRenewalRate || 85}%</div>
                <div style={{ color: '#52c41a', fontSize: 12, marginTop: 4 }}>
                  <ArrowUpOutlined /> 较上月提升 3%
                </div>
              </div>
              <Avatar size={48} style={{ backgroundColor: '#fff7e6', color: '#faad14' }} icon={<RiseOutlined />} />
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, color: '#999', marginBottom: 8 }}>教师满意度</div>
                <div style={{ fontSize: 28, fontWeight: 'bold' }}>{overview.avgSatisfaction || 4.7}</div>
                <div style={{ color: '#52c41a', fontSize: 12, marginTop: 4 }}>
                  <StarOutlined /> 优秀
                </div>
              </div>
              <Avatar size={48} style={{ backgroundColor: '#f9f0ff', color: '#722ed1' }} icon={<StarOutlined />} />
            </div>
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="classes">
        <TabPane tab="班级数据分析" key="classes">
          <Row gutter={16}>
            <Col span={12}>
              <Card title="各班级续报率对比" className="card-shadow">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={classData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="renewalRate" name="续报率(%)" fill="#1890ff" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="各班级平均分提升率" className="card-shadow">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={classData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="scoreImprove" name="提升率(%)" fill="#52c41a" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={12}>
              <Card title="各班级教师满意度评分" className="card-shadow">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={classData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="satisfaction" name="满意度" stroke="#722ed1" strokeWidth={2} dot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="学员学科分布" className="card-shadow">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={overview.subjectStats || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="教师绩效排行榜" key="performance">
          <Card className="card-shadow">
            <Table
              columns={performanceColumns}
              dataSource={performances}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Statistics;
