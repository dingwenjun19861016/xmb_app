const CRYPTO_SYMBOLS = {
  'BTC': ['bitcoin', 'btc', '比特币'],
  'ETH': ['ethereum', 'eth', '以太坊', '以太'],
  'USDT': ['tether', 'usdt', '泰达币'],
  'BNB': ['binance', 'bnb', '币安币'],
  'SOL': ['solana', 'sol', '索拉纳'],
  'XRP': ['xrp', 'ripple', '瑞波币'],
  'USDC': ['usdc'],
  'ADA': ['cardano', 'ada', '卡尔达诺'],
  'DOGE': ['dogecoin', 'doge', '狗狗币'],
  'AVAX': ['avalanche', 'avax', '雪崩'],
  'SHIB': ['shiba', 'shib', '柴犬币'],
  'DOT': ['polkadot', 'dot', '波卡'],
  'TRX': ['tron', 'trx', '波场','孙宇晨'],
  'POL': ['polygon', 'matic', '马蹄'],
  'LINK': ['chainlink', 'link', '链环'],
  'UNI': ['uniswap', 'uni', '独角兽'],
  'LTC': ['litecoin', 'ltc', '莱特币'],
  'BCH': ['bitcoin cash', 'bch', '比特币现金'],
  'ATOM': ['cosmos', 'atom', '阿童木'],
  'FIL': ['filecoin', 'fil'],
  'VET': ['vechain', 'vet', '唯链'],
  'ICP': ['internet computer', 'icp'],
  'NEAR': ['near'],
  'ALGO': ['algorand', 'algo', '算法兰德'],
  'XMR': ['monero', 'xmr', '门罗币'],
  'ETC': ['ethereum classic', 'etc', '以太坊经典'],
  'FLOW': ['flow', '流量币'],
  'SAND': ['sandbox', 'sand'],
  'MANA': ['decentraland', 'mana'],
  'GRT': ['the graph', 'grt', '图协议'],
  'CRV': ['curve', 'crv'],
  'COMP': ['compound', 'comp'],
  'AAVE': ['aave'],
  'SNX': ['synthetix', 'snx'],
  'SUSHI': ['sushiswap', 'sushi'],
  'YFI': ['yearn', 'yfi'],
  'ENJ': ['enjin', 'enj', '恩金'],
  'BAT': ['basic attention token', 'bat', '注意力币'],
  'ZEC': ['zcash', 'zec', '零币'],
  'DASH': ['dash', '达世币'],
  'NEO': ['neo', '小蚁币'],
  'XTZ': ['tezos', 'xtz'],
  'THETA': ['theta', '西塔'],
  'FTM': ['fantom', 'ftm', '幻影'],
  'S': ['fantom', 'ftm', 'sonic'],
  'LUNA': ['terra', 'luna', '月神'],
  'HBAR': ['hedera', 'hbar', '海德拉'],
  'XLM': ['stellar', 'xlm', '恒星币'],
  'ONE': ['harmony', 'one', '和谐币'],
  'HNT': ['helium', 'hnt', '氦币'],
  'CHZ': ['chiliz', 'chz', '辣椒币'],
  'GALA': ['gala'],
  'APE': ['apecoin', 'ape', '猿币'],
  'IMX': ['immutable', 'imx'],
  'LRC': ['loopring', 'lrc', '路印'],
  'ENS': ['ethereum name service', 'ens', '以太坊域名'],
  
  // Top 100+ coins from CoinMarketCap
  'CFG': ['centrifuge', 'cfg'],
  'TON': ['toncoin', 'ton', 'telegram'],
  'LEO': ['unus sed leo', 'leo'],
  'DAI': ['dai'],
  'USDe': ['ethena usde', 'usde'],
  'PEPE': ['pepe'],
  'BGB': ['bitget token', 'bgb'],
  'TAO': ['bittensor', 'tao'],
  'CRO': ['cronos', 'cro'],
  'NEAR': ['near protocol', 'near'],
  'APT': ['aptos', 'apt'],
  'PI': ['pi'],
  'ONDO': ['ondo'],
  'ENA': ['ethena', 'ena'],
  'OKB': ['okb'],
  'BONK': ['bonk'],
  'MNT': ['mantle', 'mnt'],
  'KAS': ['kaspa', 'kas'],
  'ARB': ['arbitrum', 'arb'],
  'RENDER': ['render'],
  'USD1': ['world liberty financial usd', 'usd1'],
  'GT': ['gatetoken', 'gt'],
  'TRUMP': ['official trump', 'trump'],
  'WLD': ['worldcoin', 'wld'],
  'SEI': ['sei'],
  'PENGU': ['pudgy penguins', 'pengu'],
  'FET': ['artificial superintelligence alliance', 'fet'],
  'SPX': ['spx6900', 'spx'],
  'SKY': ['sky'],
  'JUP': ['jupiter', 'jup'],
  'XDC': ['xdc network', 'xdc'],
  'TIA': ['celestia', 'tia'],
  'KCS': ['kucoin token', 'kcs'],
  'PUMP': ['pump.fun', 'pump'],
  'INJ': ['injective', 'inj'],
  'FARTCOIN': ['fartcoin'],
  'FDUSD': ['first digital usd', 'fdusd'],
  'QNT': ['quant', 'qnt'],
  'FLR': ['flare', 'flr'],
  'IP': ['story', 'ip'],
  'STX': ['stacks', 'stx'],
  'OP': ['optimism', 'op'],
  'FORM': ['four', 'form'],
  'FLOKI': ['floki'],
  'WIF': ['dogwifhat', 'wif'],
  'VIRTUAL': ['virtuals protocol', 'virtual'],
  'CFX': ['conflux', 'cfx'],
  'LDO': ['lido dao', 'ldo'],
  'KAIA': ['kaia'],
  'A': ['vaulta', 'a'],
  'IOTA': ['iota'],
  'JASMY': ['jasmycoin', 'jasmy'],
  'PAXG': ['pax gold', 'paxg'],
  'CAKE': ['pancakeswap', 'cake'],
  'NEXO': ['nexo'],
  'PYUSD': ['paypal usd', 'pyusd'],
  'PYTH': ['pyth network', 'pyth'],
  'XAUt': ['tether gold', 'xaut'],
  'RAY': ['raydium', 'ray'],
  'AERO': ['aerodrome finance', 'aero'],
  'PENDLE': ['pendle'],
  'JTO': ['jito', 'jto'],
  
  // DeFi tokens
  'SUSHI': ['sushiswap', 'sushi'],
  'UNI': ['uniswap', 'uni', '独角兽'],
  'CRV': ['curve dao token', 'crv'],
  'COMP': ['compound', 'comp'],
  'AAVE': ['aave'],
  'SNX': ['synthetix', 'snx'],
  'YFI': ['yearn finance', 'yfi'],
  'BAL': ['balancer', 'bal'],
  'REN': ['ren', 'ren'],
  'ZRX': ['0x', 'zrx'],
  'KNC': ['kyber network', 'knc'],
  'BNT': ['bancor', 'bnt'],
  'MLN': ['melon', 'mln'],
  'REP': ['augur', 'rep'],
  
  // Layer 2 and scaling solutions
  'MATIC': ['polygon', 'matic', '马蹄'],
  'LRC': ['loopring', 'lrc', '路印'],
  'OMG': ['omg network', 'omg'],
  'SKL': ['skale network', 'skl'],
  'CELR': ['celer network', 'celr'],
  'METIS': ['metis', 'metis'],
  'BOBA': ['boba network', 'boba'],
  
  // NFT and Gaming tokens
  'SAND': ['the sandbox', 'sand'],
  'MANA': ['decentraland', 'mana'],
  'ENJ': ['enjin coin', 'enj', '恩金'],
  'AXS': ['axie infinity', 'axs'],
  'SLP': ['smooth love potion', 'slp'],
  'GALA': ['gala', 'gala'],
  'FLOW': ['flow', 'flow', '流量币'],
  'CHZ': ['chiliz', 'chz', '辣椒币'],
  'ALICE': ['my neighbor alice', 'alice'],
  'TLM': ['alien worlds', 'tlm'],
  'REVV': ['revv', 'revv'],
  'GODS': ['gods unchained', 'gods'],
  'SUPER': ['superfarm', 'super'],
  'UFO': ['ufo gaming', 'ufo'],
  'YGG': ['yield guild games', 'ygg'],
  'GUILD': ['blockchains guild', 'guild'],
  
  // Meme coins
  'DOGE': ['dogecoin', 'doge', '狗狗币'],
  'SHIB': ['shiba inu', 'shib', '柴犬币'],
  'PEPE': ['pepe', 'pepe'],
  'FLOKI': ['floki inu', 'floki'],
  'BABYDOGE': ['baby doge coin', 'babydoge'],
  'KISHU': ['kishu inu', 'kishu'],
  'AKITA': ['akita inu', 'akita'],
  'HOGE': ['hoge finance', 'hoge'],
  'SAFEMOON': ['safemoon', 'safemoon'],
  'ELONGATE': ['elongate', 'elongate'],
  
  // Privacy coins
  'XMR': ['monero', 'xmr', '门罗币'],
  'ZEC': ['zcash', 'zec', '零币'],
  'DASH': ['dash', 'dash', '达世币'],
  'SCRT': ['secret', 'scrt'],
  'BEAM': ['beam', 'beam'],
  'GRIN': ['grin', 'grin'],
  'FIRO': ['firo', 'firo'],
  'ARRR': ['pirate chain', 'arrr'],
  'DERO': ['dero', 'dero'],
  'XVG': ['verge', 'xvg'],
  
  // Interoperability and bridges
  'DOT': ['polkadot', 'dot', '波卡'],
  'ATOM': ['cosmos', 'atom', '阿童木'],
  'AVAX': ['avalanche', 'avax', '雪崩'],
  'LUNA': ['terra luna', 'luna', '月神'],
  'KSM': ['kusama', 'ksm'],
  'OSMO': ['osmosis', 'osmo'],
  'JUNO': ['juno network', 'juno'],
  'SCRT': ['secret network', 'scrt'],
  'REGEN': ['regen network', 'regen'],
  'IOV': ['starname', 'iov'],
  
  // Oracle tokens
  'LINK': ['chainlink', 'link', '链环'],
  'BAND': ['band protocol', 'band'],
  'TRB': ['tellor', 'trb'],
  'API3': ['api3', 'api3'],
  'DIA': ['dia', 'dia'],
  'UMA': ['uma', 'uma'],
  'NEST': ['nest protocol', 'nest'],
  
  // Storage and data
  'FIL': ['filecoin', 'fil'],
  'AR': ['arweave', 'ar'],
  'SC': ['siacoin', 'sc'],
  'STORJ': ['storj', 'storj'],
  'BTT': ['bittorrent', 'btt'],
  'THETA': ['theta network', 'theta', '西塔'],
  'TFUEL': ['theta fuel', 'tfuel'],
  'GRT': ['the graph', 'grt', '图协议'],
  'OCEAN': ['ocean protocol', 'ocean'],
  'NMR': ['numeraire', 'nmr'],
  
  // Layer 1 blockchains
  'SOL': ['solana', 'sol', '索拉纳'],
  'ADA': ['cardano', 'ada', '卡尔达诺'],
  'ALGO': ['algorand', 'algo', '算法兰德'],
  'XTZ': ['tezos', 'xtz'],
  'EGLD': ['multiversx', 'egld'],
  'HBAR': ['hedera hashgraph', 'hbar', '海德拉'],
  'IOTA': ['iota', 'iota'],
  'XLM': ['stellar', 'xlm', '恒星币'],
  'VET': ['vechain', 'vet', '唯链'],
  'ICX': ['icon', 'icx'],
  'ONT': ['ontology', 'ont'],
  'QTUM': ['qtum', 'qtum'],
  'ZIL': ['zilliqa', 'zil'],
  'NEO': ['neo', 'neo', '小蚁币'],
  'WAVES': ['waves', 'waves'],
  'LSK': ['lisk', 'lsk'],
  'STRAT': ['stratis', 'strat'],
  'ARK': ['ark', 'ark'],
  'KMD': ['komodo', 'kmd'],
  'DCR': ['decred', 'dcr'],
  'RVN': ['ravencoin', 'rvn'],
  'DGB': ['digibyte', 'dgb'],
  'SYS': ['syscoin', 'sys'],
  'PIVX': ['pivx', 'pivx'],
  'XEM': ['nem', 'xem'],
  'XYM': ['symbol', 'xym'],
  
  // Enterprise and business
  'XRP': ['xrp', 'ripple', '瑞波币'],
  'XLM': ['stellar lumens', 'xlm', '恒星币'],
  'HBAR': ['hedera', 'hbar', '海德拉'],
  'VET': ['vechain thor', 'vet', '唯链'],
  'IOST': ['iost', 'iost'],
  'HOT': ['holo', 'hot'],
  'WAN': ['wanchain', 'wan'],
  'POLY': ['polymath', 'poly'],
  'AMB': ['ambrosus', 'amb'],
  'WTC': ['waltonchain', 'wtc'],
  
  // Exchange tokens
  'BNB': ['binance coin', 'bnb', '币安币'],
  'HT': ['huobi token', 'ht'],
  'OKB': ['okex token', 'okb'],
  'KCS': ['kucoin shares', 'kcs'],
  'FTT': ['ftx token', 'ftt'],
  'LEO': ['bitfinex leo', 'leo'],
  'CRO': ['crypto.com coin', 'cro'],
  'MCO': ['monaco', 'mco'],
  'BGB': ['bitget token', 'bgb'],
  'GT': ['gatechain token', 'gt'],
  
  // Utility tokens
  'BAT': ['basic attention token', 'bat', '注意力币'],
  'ZIL': ['zilliqa', 'zil'],
  'REQ': ['request network', 'req'],
  'POWR': ['power ledger', 'powr'],
  'FUN': ['funfair', 'fun'],
  'DENT': ['dent', 'dent'],
  'CIVIC': ['civic', 'cvc'],
  'SNT': ['status', 'snt'],
  'GNT': ['golem', 'gnt'],
  'RLC': ['iexec rlc', 'rlc'],
  'STORJ': ['storj', 'storj'],
  'MAID': ['maidsafecoin', 'maid'],
  
  // Stablecoins
  'USDT': ['tether', 'usdt', '泰达币'],
  'USDC': ['usd coin', 'usdc'],
  'BUSD': ['binance usd', 'busd'],
  'DAI': ['dai', 'dai'],
  'TUSD': ['trueusd', 'tusd'],
  'PAX': ['paxos standard', 'pax'],
  'GUSD': ['gemini dollar', 'gusd'],
  'HUSD': ['husd', 'husd'],
  'USDN': ['neutrino usd', 'usdn'],
  'RSR': ['reserve rights', 'rsr'],
  'AMPL': ['ampleforth', 'ampl'],
  'FEI': ['fei protocol', 'fei'],
  'FRAX': ['frax', 'frax'],
  'MIM': ['magic internet money', 'mim'],
  'UST': ['terrausd', 'ust'],
  'USDD': ['usdd', 'usdd'],
  'USTC': ['terrausd classic', 'ustc'],
  
  // Derivatives and synthetic assets
  'SNX': ['synthetix', 'snx'],
  'UMA': ['uma', 'uma'],
  'PERP': ['perpetual protocol', 'perp'],
  'DYDX': ['dydx', 'dydx'],
  'INJ': ['injective protocol', 'inj'],
  'HEGIC': ['hegic', 'hegic'],
  'OPTI': ['opyn', 'opti'],
  'TORN': ['tornado cash', 'torn'],
  'CVX': ['convex finance', 'cvx'],
  'FXS': ['frax share', 'fxs'],
  'CRV': ['curve dao token', 'crv'],
  'SPELL': ['spell token', 'spell'],
  'ICE': ['ice token', 'ice'],
  
  // Cross-chain and bridges
  'REN': ['ren', 'ren'],
  'ANY': ['anyswap', 'any'],
  'SYN': ['synapse', 'syn'],
  'CELR': ['celer network', 'celr'],
  'POLY': ['polyswarm', 'poly'],
  'SWTH': ['switcheo', 'swth'],
  'RUNE': ['thorchain', 'rune'],
  'ROWAN': ['sifchain', 'rowan'],
  'BRIDGE': ['cross chain bridge', 'bridge'],
  
  // Real World Assets (RWA)
  'CFG': ['centrifuge', 'cfg'],
  'MPL': ['maple', 'mpl'],
  'TRU': ['truefi', 'tru'],
  'POOL': ['pooltogether', 'pool'],
  'CREDIT': ['credit', 'credit'],
  'BACKED': ['backed', 'backed'],
  'RWA': ['real world asset', 'rwa'],
  'GOLD': ['gold token', 'gold'],
  'SILVER': ['silver token', 'silver'],
  'OIL': ['oil token', 'oil'],
  
  // AI and Machine Learning
  'FET': ['fetch.ai', 'fet'],
  'AGIX': ['singularitynet', 'agix'],
  'OCEAN': ['ocean protocol', 'ocean'],
  'NMR': ['numerai', 'nmr'],
  'CTX': ['cortex', 'ctx'],
  'DBC': ['deepbrain chain', 'dbc'],
  'MATRIX': ['matrix ai network', 'matrix'],
  'EFFECT': ['effect.ai', 'effect'],
  'AGI': ['artificial general intelligence', 'agi'],
  'BRAIN': ['braintrust', 'brain'],
  
  // Additional top cryptocurrencies from APIs
  'HYPE': ['hyperliquid', 'hype'],
  'SUI': ['sui', 'sui'],
  'MOVE': ['movement', 'move'],
  'USUAL': ['usual', 'usual'],
  'EIGEN': ['eigenlayer', 'eigen'],
  'ZK': ['zksync', 'zk'],
  'W': ['wormhole', 'w'],
  'STRK': ['starknet', 'strk'],
  'MANTA': ['manta network', 'manta'],
  'BLAST': ['blast', 'blast'],
  'MODE': ['mode', 'mode'],
  'LINEA': ['linea', 'linea'],
  'SCROLL': ['scroll', 'scroll'],
  'BASE': ['base', 'base'],
  'ZETA': ['zetachain', 'zeta'],
  'TAIKO': ['taiko', 'taiko'],
  'MOBILE': ['helium mobile', 'mobile'],
  'IOT': ['helium iot', 'iot'],
  'HONEY': ['hivemapper', 'honey'],
  'DIMO': ['dimo', 'dimo'],
  'RONIN': ['ronin', 'ronin'],
  'MAGIC': ['treasure', 'magic'],
  'PRIME': ['echelon prime', 'prime'],
  'AI16Z': ['ai16z', 'ai16z'],
  'GOAT': ['goatseus maximus', 'goat'],
  'ZEREBRO': ['zerebro', 'zerebro'],
  'GRASS': ['grass', 'grass'],
  'CHILLGUY': ['just a chill guy', 'chillguy'],
  'ACT': ['act i : the ai prophecy', 'act'],
  'PNUT': ['peanut the squirrel', 'pnut'],
  'TURBO': ['turbo', 'turbo'],
  'BRETT': ['brett', 'brett'],
  'NEIRO': ['neiro', 'neiro'],
  'POPCAT': ['popcat', 'popcat'],
  'MEW': ['cat in a dogs world', 'mew'],
  'MOTHER': ['mother iggy', 'mother'],
  'SLERF': ['slerf', 'slerf'],
  'BOME': ['book of meme', 'bome'],
  'MELANIA': ['melania', 'melania'],
  'RDNT': ['radiant capital', 'rdnt'],
  'GMX': ['gmx', 'gmx'],
  'JOE': ['traderjoe', 'joe'],
  'VELO': ['velodrome', 'velo'],
  'KAVA': ['kava', 'kava'],
  'HARD': ['hard protocol', 'hard'],
  'SWP': ['swipe', 'swp'],
  'MKR': ['maker', 'mkr'],
  'ALPHA': ['alpha finance', 'alpha'],
  'CREAM': ['cream finance', 'cream'],
  'BADGER': ['badger dao', 'badger'],
  'DIGG': ['digg', 'digg'],
  'PICKLE': ['pickle finance', 'pickle'],
  'SOCKS': ['unisocks', 'socks'],
  'DUCK': ['duck dao', 'duck'],
  'VALUE': ['value defi', 'value'],
  'FARM': ['harvest finance', 'farm'],
  'BASK': ['basket dao', 'bask'],
  'INDEX': ['index cooperative', 'index'],
  'DPI': ['defi pulse index', 'dpi'],
  'MVI': ['metaverse index', 'mvi'],
  'DATA': ['streamr', 'data'],
  'BED': ['bankless bed index', 'bed'],
  'DESO': ['decentralized social', 'deso'],
  'RALLY': ['rally', 'rally'],
  'WHALE': ['whale', 'whale'],
  'ALEX': ['alex', 'alex'],
  'FRIEND': ['friend.tech', 'friend'],
  'SOCIAL': ['social token', 'social'],
  'CREATOR': ['creator economy', 'creator'],
  'CONTENT': ['content protocol', 'content'],
  'MEDIA': ['media protocol', 'media'],
  'STREAM': ['stream token', 'stream'],
  'ROSE': ['oasis network', 'rose'],
  'NYM': ['nym', 'nym'],
  'KEEP': ['keep network', 'keep'],
  'NU': ['nucypher', 'nu'],
  'RAILGUN': ['railgun', 'railgun'],
  'AZTEC': ['aztec', 'aztec'],
  'MINA': ['mina protocol', 'mina'],
  'ALEO': ['aleo', 'aleo'],
  'LUNC': ['terra luna classic', 'lunc'],
  'MC': ['merit circle', 'mc'],
  'NAKA': ['nakamoto games', 'naka'],
  'SIDUS': ['sidus heroes', 'sidus'],
  'SKILL': ['cryptoblades', 'skill'],
  'JEWEL': ['defi kingdoms', 'jewel'],
  'CRYSTAL': ['crystal token', 'crystal'],
  'DPET': ['my defi pet', 'dpet'],
  'MBOX': ['mobox', 'mbox'],
  'TOWER': ['crazy defense heroes', 'tower'],
  'PYR': ['vulcan forged', 'pyr'],
  'LOKA': ['league of kingdoms', 'loka'],
  'ETERNAL': ['cryptomines eternal', 'eternal'],
  'WILD': ['wilder world', 'wild'],
  'STARL': ['starlink', 'starl'],
  
  // DeFi 2.0 and newer protocols
  'CVX': ['convex finance', 'cvx'],
  'FXS': ['frax share', 'fxs'],
  'SPELL': ['spell token', 'spell'],
  'ICE': ['ice token', 'ice'],
  'LOOKS': ['looksrare', 'looks'],
  'X2Y2': ['x2y2', 'x2y2'],
  'BLUR': ['blur', 'blur'],
  'SUDO': ['sudoswap', 'sudo'],
  'FORT': ['forta', 'fort'],
  'ANKR': ['ankr', 'ankr'],
  'CTSI': ['cartesi', 'ctsi'],
  'MASK': ['mask network', 'mask'],
  'LPT': ['livepeer', 'lpt'],
  'AUDIO': ['audius', 'audio'],
  'CLV': ['clover finance', 'clv'],
  'RNDR': ['render', 'rndr'],
  'POWR': ['power ledger', 'powr'],
  'COTI': ['coti', 'coti'],
  'CELR': ['celer network', 'celr'],
  'SKALE': ['skale', 'skl'],
  'IOTX': ['iotex', 'iotx'],
  'DOCK': ['dock', 'dock'],
  'ORAI': ['oraichain', 'orai'],
  'ROSE': ['oasis', 'rose'],
  'KILT': ['kilt protocol', 'kilt'],
  'GLMR': ['moonbeam', 'glmr'],
  'MOVR': ['moonriver', 'movr'],
  'SDN': ['shiden', 'sdn'],
  'ASTR': ['astar', 'astr'],
  'PHA': ['phala network', 'pha'],
  'LIT': ['lit protocol', 'lit'],
  'SWAP': ['trustswap', 'swap'],
  'UTK': ['utrust', 'utk'],
  'MLK': ['milk protocol', 'mlk'],
  'MULTI': ['multichain', 'multi'],
  'ANYETH': ['anyswap wrapped eth', 'anyeth'],
  'QUICK': ['quickswap', 'quick'],
  'DFYN': ['dfyn network', 'dfyn'],
  'DODO': ['dodo', 'dodo'],
  'SAITAMA': ['saitama', 'saitama'],
  'ELON': ['dogelon mars', 'elon'],
  'SAMO': ['samoyedcoin', 'samo'],
  'COPE': ['cope', 'cope'],
  'FIDA': ['bonfida', 'fida'],
  'MAPS': ['maps', 'maps'],
  'MEDIA': ['media network', 'media'],
  'ROPE': ['rope', 'rope'],
  'STEP': ['step finance', 'step'],
  'TULIP': ['tulip protocol', 'tulip'],
  'SLRS': ['solrise finance', 'slrs'],
  'PORT': ['port finance', 'port'],
  'LARIX': ['larix', 'larix'],
  'SUNNY': ['sunny aggregator', 'sunny'],
  'DFL': ['defiland', 'dfl'],

  // 美股

  'AAPLX': ['apple', 'aapl', '苹果'],
  'GOOGLX': ['google', 'googl', '谷歌'],
  'AMZNX': ['amazon', 'amzn', '亚马逊'],
  'MSFTX': ['microsoft', 'msft', '微软'],
  'TSLAX': ['tesla', 'tsla', '特斯拉'],
  'METAX': ['facebook', 'meta', 'meta platforms'],
  'NVDAX': ['nvidia', 'nvda', '英伟达'],
  'COINX': ['coinbase'],
  'HOODX': ['hood', 'robinhood'],
  'DFDVX': ['DeFi Development'],
  'NFLXX': ['netflix', 'nflx', '奈飞'],
  'SPYX': ['spy', '标普500'],
  'MCDX': ['mcdonalds', '麦当劳'],
  'CRCLX': ['circle', 'usdc'],
  'MSTRX': ['microstrategy', 'strategy', 'mstr',  '微策略'],
};

import { configService } from '../../services/ConfigService';

// 本地币种别名配置
const LOCAL_CRYPTO_SYMBOLS = CRYPTO_SYMBOLS;

// 合并后的币种别名配置（会在初始化后更新）
let MERGED_CRYPTO_SYMBOLS = { ...LOCAL_CRYPTO_SYMBOLS };

// 初始化标志
let isInitialized = false;

// 初始化合并配置的异步函数
async function initializeCoinAliases(): Promise<void> {
  try {
    // 确保 ConfigService 已初始化
    await configService.init();
    
    const remoteConfigStr = await configService.getConfig('MARKET_COIN_ALIAS', '{}');
    
    // 只有当远程配置不为空时才解析
    if (remoteConfigStr && remoteConfigStr !== '{}') {
      const remoteConfig = JSON.parse(remoteConfigStr);
      
      if (remoteConfig && typeof remoteConfig === 'object' && Object.keys(remoteConfig).length > 0) {
        // 远程配置覆盖本地配置：{...本地, ...远程}
        MERGED_CRYPTO_SYMBOLS = { ...LOCAL_CRYPTO_SYMBOLS, ...remoteConfig };
        console.log('✅ CoinAlias: Successfully merged remote config with', Object.keys(remoteConfig).length, 'symbols');
      } else {
        console.log('ℹ️ CoinAlias: Remote config is empty, using local only');
        MERGED_CRYPTO_SYMBOLS = { ...LOCAL_CRYPTO_SYMBOLS };
      }
    } else {
      console.log('ℹ️ CoinAlias: No remote config found, using local only');
      MERGED_CRYPTO_SYMBOLS = { ...LOCAL_CRYPTO_SYMBOLS };
    }
  } catch (error) {
    console.warn('⚠️ CoinAlias: Failed to initialize remote config, using local only:', error);
    MERGED_CRYPTO_SYMBOLS = { ...LOCAL_CRYPTO_SYMBOLS };
  }
  
  isInitialized = true;
}

// 获取合并后的币种别名配置（异步）
export async function getCoinAliases(): Promise<Record<string, string[]>> {
  if (!isInitialized) {
    await initializeCoinAliases();
  }
  return MERGED_CRYPTO_SYMBOLS;
}

// 币种符号标准化函数（异步）
export async function resolveCoinSymbol(input: string): Promise<string> {
  if (!input) return '';
  
  const aliases = await getCoinAliases();
  const normalizedInput = input.trim().toUpperCase();
  
  // 如果直接是符号，返回
  if (aliases[normalizedInput]) {
    return normalizedInput;
  }
  
  // 遍历所有别名，查找匹配
  for (const [symbol, aliasArray] of Object.entries(aliases)) {
    if (aliasArray.some(alias => 
      alias.toLowerCase() === input.toLowerCase().trim()
    )) {
      return symbol;
    }
  }
  
  // 如果没有找到匹配的别名，返回原始输入的大写形式
  return normalizedInput;
}

// 币种符号标准化函数（同步版本，仅使用本地配置）
export function resolveCoinSymbolSync(input: string): string {
  if (!input) return '';
  
  const normalizedInput = input.trim().toUpperCase();
  
  // 如果直接是符号，返回
  if (LOCAL_CRYPTO_SYMBOLS[normalizedInput]) {
    return normalizedInput;
  }
  
  // 遍历所有别名，查找匹配
  for (const [symbol, aliases] of Object.entries(LOCAL_CRYPTO_SYMBOLS)) {
    if (aliases.some(alias => 
      alias.toLowerCase() === input.toLowerCase().trim()
    )) {
      return symbol;
    }
  }
  
  // 如果没有找到匹配的别名，返回原始输入的大写形式
  return normalizedInput;
}

// 导出配置（同步，仅本地配置用于向后兼容）
export { LOCAL_CRYPTO_SYMBOLS as CRYPTO_SYMBOLS };