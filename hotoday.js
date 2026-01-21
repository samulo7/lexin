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
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36', // 伪装成手机浏览器，减少被 ban 概率
    'Accept-Language': 'zh-CN,zh;q=0.9',
  };

  const handler = (error, response, body) => {
    if (error) {
      console.log(`[热榜] 网络错误: ${error}`);
      $done();
      return;
    }

    // 核心调试代码：看看服务器到底给脚本返回了什么鬼东西
    console.log(`[调试] 状态码: ${response.status}`);
    console.log(`[调试] HTML内容预览: ${body.slice(0, 300)}`); // 打印前300个字符

    const hotSearchList = parseHotSearchList(body);
    
    if (hotSearchList.length === 0) {
      console.log(`[失败] 正则匹配数为0，这说明返回的不是正常的网页。`);
      notify(`${config.platform}热榜`, '', '获取失败：可能被 Cloudflare 拦截');
    } else {
      // 成功逻辑
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
  // 修改后的正则：不强制要求 class="al"，只要是 href="/l?e=" 开头的链接都抓
  const regex = /<a href="\/l\?e=[^"]+"[^>]*>([\s\S]*?)<\/a>/g;
  const list = [];
  let match;

  while ((match = regex.exec(html)) !== null) {
    // 过滤掉可能包含 HTML 标签的杂质，只留纯文本
    let keyword = match[1].replace(/<[^>]+>/g, '').replace(/[\r\n]/g, '').trim();
    // 过滤掉一些无意义的短词（可选）
    if(keyword && keyword.length > 1) {
      list.push(keyword);
    }
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
