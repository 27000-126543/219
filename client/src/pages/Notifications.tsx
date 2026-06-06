import { useState, useEffect } from 'react';
import {
  List,
  Card,
  Tag,
  Button,
  Space,
  Typography,
  Spin,
  message,
  Empty,
  Badge,
  Avatar,
  Select,
  Input,
  Row,
  Col,
} from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  EyeOutlined,
  DownloadOutlined,
  CalendarOutlined,
  WarningOutlined,
  ScheduleOutlined,
  FileTextOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useStore } from '../store/useStore';
import { statisticsApi } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const Notifications = () => {
  const { user, unreadCount, markAllRead } = useStore();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterRead, setFilterRead] = useState<string>('ALL');

  useEffect(() => {
    loadData();
  }, [filterType, filterRead]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterType !== 'ALL') params.type = filterType;
      if (filterRead !== 'ALL') params.isRead = filterRead === 'READ';
      
      const res = await statisticsApi.getNotifications(params);
      if (res.data.success) {
        setNotifications(res.data.data.notifications || res.data.data || []);
      }
    } catch (error) {
      console.error('Load notifications failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      const res = await statisticsApi.markNotificationRead(id);
      if (res.data.success) {
        message.success('已标记为已读');
        loadData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '操作失败');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await statisticsApi.markAllNotificationsRead();
      if (res.data.success) {
        message.success('全部已标记为已读');
        loadData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '操作失败');
    }
  };

  const typeIcons: Record<string, any> = {
    CLASS_REMINDER: <CalendarOutlined />,
    SCORE_ALERT: <WarningOutlined />,
    SCHEDULE_CHANGE: <ScheduleOutlined />,
    REFUND_REQUEST: <DollarOutlined />,
    ASSIGNMENT_REMINDER: <FileTextOutlined />,
    EXAM_REMINDER: <FileTextOutlined />,
    WAITLIST_NOTIFICATION: <BellOutlined />,
    SYSTEM_MESSAGE: <BellOutlined />,
  };

  const typeColors: Record<string, string> = {
    CLASS_REMINDER: 'blue',
    SCORE_ALERT: 'red',
    SCHEDULE_CHANGE: 'orange',
    REFUND_REQUEST: 'purple',
    ASSIGNMENT_REMINDER: 'green',
    EXAM_REMINDER: 'cyan',
    WAITLIST_NOTIFICATION: 'magenta',
    SYSTEM_MESSAGE: 'default',
  };

  const typeLabels: Record<string, string> = {
    CLASS_REMINDER: '课程提醒',
    SCORE_ALERT: '成绩预警',
    SCHEDULE_CHANGE: '调课通知',
    REFUND_REQUEST: '退费申请',
    ASSIGNMENT_REMINDER: '作业提醒',
    EXAM_REMINDER: '考试提醒',
    WAITLIST_NOTIFICATION: '候补通知',
    SYSTEM_MESSAGE: '系统消息',
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  const filteredNotifications = notifications.filter(n => {
    if (filterType !== 'ALL' && n.type !== filterType) return false;
    if (filterRead === 'READ' && !n.isRead) return false;
    if (filterRead === 'UNREAD' && n.isRead) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          消息通知
          {unreadCount > 0 && (
            <Badge count={unreadCount} style={{ marginLeft: 12 }} />
          )}
        </Title>
        <Space>
          <Button onClick={handleMarkAllRead}>全部已读</Button>
        </Space>
      </div>

      <Card className="card-shadow" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Select
              style={{ width: '100%' }}
              value={filterType}
              onChange={setFilterType}
              placeholder="筛选类型"
            >
              <Option value="ALL">全部类型</Option>
              {Object.entries(typeLabels).map(([key, label]) => (
                <Option key={key} value={key}>{label}</Option>
              ))}
            </Select>
          </Col>
          <Col span={8}>
            <Select
              style={{ width: '100%' }}
              value={filterRead}
              onChange={setFilterRead}
              placeholder="筛选状态"
            >
              <Option value="ALL">全部状态</Option>
              <Option value="UNREAD">未读</Option>
              <Option value="READ">已读</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      <Card className="card-shadow">
        {filteredNotifications.length === 0 ? (
          <Empty description="暂无消息" />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={filteredNotifications}
            renderItem={(item) => (
              <List.Item
                style={{
                  background: item.isRead ? '#fff' : '#f6ffed',
                  padding: 16,
                  borderRadius: 8,
                  marginBottom: 8,
                }}
                actions={[
                  !item.isRead && (
                    <Button
                      type="link"
                      icon={<CheckOutlined />}
                      onClick={() => handleMarkRead(item.id)}
                    >
                      标为已读
                    </Button>
                  ),
                  item.data?.downloadUrl && (
                    <Button
                      type="link"
                      icon={<DownloadOutlined />}
                      onClick={() => window.open(item.data.downloadUrl, '_blank')}
                    >
                      下载凭证
                    </Button>
                  ),
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      style={{ backgroundColor: typeColors[item.type] + '20', color: typeColors[item.type] }}
                      icon={typeIcons[item.type] || <BellOutlined />}
                    />
                  }
                  title={
                    <Space>
                      <span style={{ fontWeight: item.isRead ? 'normal' : 'bold' }}>{item.title}</span>
                      <Tag color={typeColors[item.type]}>
                        {typeLabels[item.type] || '系统消息'}
                      </Tag>
                      {!item.isRead && <Badge status="processing" />}
                    </Space>
                  }
                  description={
                    <div>
                      <p style={{ margin: '4px 0', color: '#666' }}>{item.content}</p>
                      <span style={{ color: '#999', fontSize: 12 }}>
                        {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}
                      </span>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default Notifications;
