const http = require('http');

function post(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { resolve(body); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { resolve(body); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('=== 1. 登录 ===');
  const loginRes = await post('/api/auth/login', { username: 'admin', password: '123456' });
  console.log('登录响应:', JSON.stringify(loginRes, null, 2).slice(0, 500));
  const token = loginRes.data.token;

  console.log('\n=== 2. 获取我的班级 ===');
  const classes = await get('/api/classes/my', token);
  console.log('班级数量:', classes.data?.length);
  if (classes.data?.length > 0) {
    console.log('第一个班级名称:', classes.data[0].name);
    console.log('第一个班级 course 字段:', JSON.stringify(classes.data[0].course, null, 2));
    console.log('第一个班级 subject 字段:', JSON.stringify(classes.data[0].subject, null, 2));
  } else {
    console.log('班级为空! 完整响应:', JSON.stringify(classes, null, 2).slice(0, 500));
  }

  console.log('\n=== 3. 获取直播课列表 ===');
  const sessions = await get('/api/live', token);
  console.log('直播课数量:', sessions.data?.length);
  if (sessions.data?.length > 0) {
    console.log('第一个直播课:', JSON.stringify(sessions.data[0], null, 2).slice(0, 400));
  } else {
    console.log('直播课为空! 完整响应:', JSON.stringify(sessions, null, 2).slice(0, 500));
  }

  console.log('\n=== 4. 获取作业列表 ===');
  const assignments = await get('/api/assignments', token);
  console.log('作业数量:', assignments.data?.length);
  if (assignments.data?.length > 0) {
    console.log('第一个作业:', JSON.stringify(assignments.data[0], null, 2).slice(0, 400));
  } else {
    console.log('作业为空! 完整响应:', JSON.stringify(assignments, null, 2).slice(0, 500));
  }

  console.log('\n=== 5. 获取统计概览 ===');
  const overview = await get('/api/statistics/overview', token);
  console.log('完整 overview 响应:', JSON.stringify(overview, null, 2).slice(0, 2000));
  console.log('subjectStats 数量:', overview.data?.subjectStats?.length);
  console.log('subjectStats:', JSON.stringify(overview.data?.subjectStats, null, 2));

  console.log('\n=== 6. 测试班级统计（钢琴启蒙A班） ===');
  const pianoClass = classes.data?.find((c) => c.name.includes('钢琴'));
  if (pianoClass) {
    const stats = await get(`/api/classes/${pianoClass.id}/statistics`, token);
    console.log('班级统计 students:', stats.data?.students?.length);
    console.log('班级统计 attendanceTrend:', JSON.stringify(stats.data?.attendanceTrend));
    console.log('班级统计 scoreTrend:', JSON.stringify(stats.data?.scoreTrend));
    console.log('班级统计 liveSessions:', stats.data?.liveSessions?.length);
    console.log('班级统计 assignments:', stats.data?.assignments?.length);
  }
}

main().catch(console.error);
