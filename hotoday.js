/**
 * iOS 网络脚本：今日热榜增强版
 * 优化：iOS 网络与安全专家
 */

// 1. 配置映射表 (Dictionary) - 易于维护
const PlatformMap = {
  '微博': 'KqndgxeLl9',
  '知乎': 'mproPpoq6O',
  '微信': 'WnBe01o371',
  '今日头条': 'x9ozB4KoXb',
  '澎湃': 'wWmoO5Rd4E',
  '百度': 'Jb0vmloB1G',
  '36氪': 'Q1Vd5Ko85R',
  '少数派': 'NaEdZZXdrO',
  '财新': 'x9ozBY7oXb',
  'ZAKER': '5VaobJgoAj',
  '新京报': 'YqoXQ8XvOD',
  '南方周末': 'ENeYQBweY4',
  '科普中国': 'DgeyxkwdZq',
  '威锋网': 'n4qv90roaK',
  '起点小说': 'VaobmGneAj',
  '纵横小说': 'b0vmYyJvB1',
  '北美票房': 'n6YoVPadZa'
};

// 2. 初始化参数
let config = {
  platform: '今日头条',
  count: 6
};

// 参数注入逻辑：Loon GUI 参数 > 持久化存储 > 默认值
if (typeof $argument !== 'undefined' && $argument !== '') {
  const params = getParams($argument);
  config.platform = params.platform || config.platform;
  config.count = parseInt(params.count) || config.count;
} else if (typeof $persistentStore !== 'undefined') {
  config.platform = $persistentStore.read("platform") || config.platform;
  config.count = parseInt($persistentStore.read("count")) || config.count;
}

const platformId = PlatformMap[config.platform] || '';
if (!platformId) {
  notify('配置错误', '', `不支持的平台名称：${config.platform}`);
  $done();
} else {
  startTask();
}

function startTask() {
  const url = `https://tophub.today/n/${platformId}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1', // 伪装成手机浏览器，减少被 ban 概率
    'Accept-Language': 'zh-CN,zh;q=0.9',
  };

  const handler = (error, response, body) => {
    if (error) {
      console.log(`[热榜] 网络错误: ${error}`);
      notify(`${config.platform}热榜`, '', '获取失败，请检查网络或节点');
      $done();
      return;
    }

    // 检查 HTTP 状态码
    if (response.status && response.status !== 200) {
      console.log(`[热榜] 异常状态码: ${response.status}`);
      notify(`${config.platform}热榜`, '', `服务器返回异常: ${response.status} (可能是反爬拦截)`);
      $done();
      return;
    }

    const hotSearchList = parseHotSearchList(body);
    
    if (hotSearchList.length === 0) {
      console.log(`[热榜] 解析失败，HTML 内容可能已变动或遇到验证码`);
      // 可选：打印 body 查看是否被 Cloudflare 拦截
      // console.log(body); 
      notify(`${config.platform}热榜`, '', '解析数据为空，可能网站改版或触发反爬');
    } else {
      const notificationContent = hotSearchList
        .slice(0, config.count)
        .map((keyword, index) => `${index + 1}. ${keyword}`)
        .join('\n');
      notify(`${config.platform}热榜`, '', notificationContent);
    }
    $done();
  };

  // 适配不同环境的网络请求
  if (typeof $task !== 'undefined') {
    $task.fetch({ url, headers }).then(
      (resp) => handler(null, resp, resp.body),
      (err) => handler(err, null, null)
    );
  } else if (typeof $httpClient !== 'undefined') {
    $httpClient.get({ url, headers }, handler);
  } else {
    console.log('未知的脚本环境');
    $done();
  }
}

// 优化的正则解析
function parseHotSearchList(html) {
  // 解释：
  // [\s\S]*? 非贪婪匹配任意字符（包括换行）
  // href="\/l\?e= 匹配链接特征
  // >([^<]+)< 捕获标签内的文本（标题）
  
  // 注意：原脚本的正则非常依赖 HTML 结构，这里稍微放宽了一点，但本质依然是 HTML Scraping
  // 如果 tophub 改版，这里必须重写
  const regex = /<td class="al">\s*<a href="\/l\?e=[^"]+"[^>]*>([\s\S]*?)<\/a>\s*<\/td>/g;
  const list = [];
  let match;

  while ((match = regex.exec(html)) !== null) {
    //去除可能的换行符和多余空格
    const keyword = match[1].replace(/[\r\n]/g, '').trim(); 
    if(keyword) list.push(keyword);
  }

  return list;
}

// 统一通知发送函数
function notify(title, subtitle, content) {
  if (typeof $notify !== 'undefined') {
    $notify(title, subtitle, content);
  } else if (typeof $notification !== 'undefined') {
    $notification.post(title, subtitle, content);
  } else {
    console.log(`${title}\n${subtitle}\n${content}`);
  }
}

function getParams(param) {
  return Object.fromEntries(
    param.split('&').map(item => item.split('=').map(decodeURIComponent))
  );
}
