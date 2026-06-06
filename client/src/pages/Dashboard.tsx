import { useState, useEffect } from 'react';
import { Row, Col, Card, List, Tag, Typography, Spin, Empty } from 'antd';
import {
  BookOutlined,
  TeamOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { useStore } from '../store/useStore';
import { classApi, liveApi, assignmentApi, courseApi, statisticsApi } from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const Dashboard = () => {
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [recentClasses, setRecentClasses] = useState<any[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [recentAssignments, setRecentAssignments] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [classesRes, sessionsRes, assignmentsRes] = await Promise.all([
        classApi.getMyClasses(),
        liveApi.getLiveSessions(),
        assignmentApi.getAssignments(),
      ]);

      if (classesRes.data.success) {
        setRecentClasses(classesRes.data.data.slice(0, 5));
      }
      if (sessionsRes.data.success) {
        const now = new Date();
        const upcoming = sessionsRes.data.data
          .filter((s: any) => new Date(s.startTime) > now)
          .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
          .slice(0, 5);
        setUpcomingSessions(upcoming);
      }
      if (assignmentsRes.data.success) {
        setRecentAssignments(assignmentsRes.data.data.slice(0, 5));
      }

      const classCount = classesRes.data.data?.length || 0;
      const sessionCount = sessionsRes.data.data?.length || 0;
      const assignmentCount = assignmentsRes.data.data?.length || 0;

      setStats({
        classes: classCount,
        sessions: sessionCount,
        assignments: assignmentCount,
        avgScore: user?.studentProfile?.averageScore || '-',
      });
    } catch (error) {
      console.error('Load dashboard data failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: '我的班级', value: stats.classes || 0, icon: <TeamOutlined style={{ fontSize: 32, color: '#1890ff' }} />, color: '#e6f7ff' },
    { title: '直播课程', value: stats.sessions || 0, icon: <VideoCameraOutlined style={{ fontSize: 32, color: '#52c41a' }} />, color: '#f6ffed' },
    { title: '作业数量', value: stats.assignments || 0, icon: <FileTextOutlined style={{ fontSize: 32, color: '#faad14' }} />, color: '#fffbe6' },
    { title: '平均成绩', value: stats.avgScore || '-', icon: <TrophyOutlined style={{ fontSize: 32, color: '#eb2f96' }} />, color: '#fff0f6' },
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
      <Title level={3} style={{ marginBottom: 24 }}>
        欢迎回来，{user?.realName}！
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((stat, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <Card className="card-shadow" style={{ background: stat.color }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {stat.icon}
                <div>
                  <div style={{ fontSize: 28, fontWeight: 600 }}>{stat.value}</div>
                  <Text type="secondary">{stat.title}</Text>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="我的班级" className="card-shadow">
            {recentClasses.length > 0 ? (
              <List
                dataSource={recentClasses}
                renderItem={(item: any) => (
                  <List.Item key={item.id}>
                    <List.Item.Meta
                      title={item.name}
                      description={
                        <div>
                          <Text type="secondary">{item.course?.name || item.code}</Text>
                          <Tag color="blue" style={{ marginLeft: 8 }}>
                            {item.currentStudents}/{item.maxStudents}人
                          </Tag>
                          <Tag color={item.status === 'ACTIVE' ? 'green' : 'orange'}>
                            {item.status === 'ACTIVE' ? '进行中' : item.status}
                          </Tag>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无班级" />
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="即将开始的直播" className="card-shadow">
            {upcomingSessions.length > 0 ? (
              <List
                dataSource={upcomingSessions}
                renderItem={(item: any) => (
                  <List.Item key={item.id}>
                    <List.Item.Meta
                      title={item.title}
                      description={
                        <div>
                          <Text type="secondary">
                            {dayjs(item.startTime).format('YYYY-MM-DD HH:mm')}
                          </Text>
                          <Tag color="blue" style={{ marginLeft: 8 }}>
                            {item.class?.name}
                          </Tag>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无即将开始的直播" />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title="最近作业" className="card-shadow">
            {recentAssignments.length > 0 ? (
              <List
                grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
                dataSource={recentAssignments}
                renderItem={(item: any) => (
                  <List.Item>
                    <Card hoverable style={{ height: '100%' }}>
                      <Card.Meta
                        title={item.title}
                        description={
                          <div>
                            <Text type="secondary">截止：{dayjs(item.dueDate).format('YYYY-MM-DD')}</Text>
                            <br />
                            <Tag color={item.type === 'ONLINE' ? 'blue' : 'green'}>
                              {item.type === 'ONLINE' ? '在线作答' : '上传作业'}
                            </Tag>
                          </div>
                        }
                      />
                    </Card>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无作业" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
