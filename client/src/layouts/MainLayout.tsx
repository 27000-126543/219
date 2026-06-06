import { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, Button } from 'antd';
import {
  DashboardOutlined,
  BookOutlined,
  TeamOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  FileSearchOutlined,
  WarningOutlined,
  ScheduleOutlined,
  BellOutlined,
  BarChartOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useStore } from '../store/useStore';

const { Header, Sider, Content } = Layout;

const roleMenuItems: Record<string, any[]> = {
  STUDENT: [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '首页' },
    { key: '/courses', icon: <BookOutlined />, label: '课程中心' },
    { key: '/classes', icon: <TeamOutlined />, label: '我的班级' },
    { key: '/live', icon: <VideoCameraOutlined />, label: '直播课程' },
    { key: '/assignments', icon: <FileTextOutlined />, label: '作业' },
    { key: '/exams', icon: <FileSearchOutlined />, label: '考试' },
    { key: '/notifications', icon: <BellOutlined />, label: '消息通知' },
  ],
  TEACHER: [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '首页' },
    { key: '/classes', icon: <TeamOutlined />, label: '我的班级' },
    { key: '/live', icon: <VideoCameraOutlined />, label: '直播课程' },
    { key: '/assignments', icon: <FileTextOutlined />, label: '作业管理' },
    { key: '/exams', icon: <FileSearchOutlined />, label: '考试管理' },
    { key: '/schedule-changes', icon: <ScheduleOutlined />, label: '调课申请' },
    { key: '/notifications', icon: <BellOutlined />, label: '消息通知' },
  ],
  HEAD_TEACHER: [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '首页' },
    { key: '/classes', icon: <TeamOutlined />, label: '班级管理' },
    { key: '/alerts', icon: <WarningOutlined />, label: '预警中心' },
    { key: '/notifications', icon: <BellOutlined />, label: '消息通知' },
  ],
  ADMIN: [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '首页' },
    { key: '/courses', icon: <BookOutlined />, label: '课程管理' },
    { key: '/classes', icon: <TeamOutlined />, label: '班级管理' },
    { key: '/live', icon: <VideoCameraOutlined />, label: '直播管理' },
    { key: '/assignments', icon: <FileTextOutlined />, label: '作业管理' },
    { key: '/exams', icon: <FileSearchOutlined />, label: '考试管理' },
    { key: '/alerts', icon: <WarningOutlined />, label: '预警中心' },
    { key: '/schedule-changes', icon: <ScheduleOutlined />, label: '调课审核' },
    { key: '/notifications', icon: <BellOutlined />, label: '消息通知' },
    { key: '/statistics', icon: <BarChartOutlined />, label: '数据统计' },
  ],
  PRINCIPAL: [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '首页' },
    { key: '/statistics', icon: <BarChartOutlined />, label: '数据统计' },
    { key: '/schedule-changes', icon: <ScheduleOutlined />, label: '调课审核' },
    { key: '/notifications', icon: <BellOutlined />, label: '消息通知' },
  ],
};

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, unreadCount } = useStore();

  const menuItems = user?.role ? roleMenuItems[user.role] || [] : [];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      logout();
      navigate('/login');
    }
  };

  const menuWithBadge = menuItems.map((item) => {
    if (item.key === '/notifications') {
      return {
        ...item,
        label: (
          <Badge count={unreadCount} size="small" offset={[10, 0]}>
            {item.label}
          </Badge>
        ),
      };
    }
    return item;
  });

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark">
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: collapsed ? 16 : 20, fontWeight: 'bold' }}>
          {collapsed ? '艺' : '艺术教育平台'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuWithBadge}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 16px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Badge count={unreadCount} size="small">
              <Button
                type="text"
                icon={<BellOutlined />}
                onClick={() => navigate('/notifications')}
              />
            </Badge>
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
              <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 8 }}>
                <Avatar icon={<UserOutlined />} src={user?.avatar} />
                <span>{user?.realName}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: 0, background: '#f0f2f5' }}>
          <div className="page-container">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
