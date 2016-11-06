/* global d3, topojson, d3iida */

/*
 * d3iida.aburatsubo.js
 * takamitsu.iida@gmail.com
 *
 * 2015.03.15 初版
 * 2015.04.16 d3.slider.jsの利用をやめて組み込みに変更
 * 2015.04.27 潮汐グラフを追加
 * 2016.10.31 d3 v4用に書き換え
 */

(function() {
  d3iida.aburatsuboat = function module() {
    // 外部に公開する関数
    var initModule;
    var resized;

    // configMapに静的な構成値を配置する
    var configMap = {
      // d3で指定するクラス名、ID名
      bname: '#play-button',
      cname: '.graphic',

      // HTML文字列
      html: String() +
        '<div class="graphic">' +
        '  <button id="play-button">開始</button>' +
        '</div>'
    };

    // このモジュール内で共有する情報をstateMapに保存。
    var stateMap = {
      $container: undefined
    };

    // ランドマークのtopojsonオブジェクト（プログラムが長くなるので内容は後で定義する）
    var landdata;

    // 潮汐グラフのオブジェクト（JSLint対策で先に定義する）
    var tideMap;
    var setTideLine;

    // 地図
    var map;
    var proto_map = {
      scale: 1500000,
      w: 800,
      h: 500,
      translate: [400, 250], // [w/2, h/2]
      center: [139.61, 35.162], // 中心の座標を指定
      duration: 20000, // ボートの軌跡を描画する時間
      path: undefined, // 背景用パスジェネレータ
      boatpath: undefined, // 軌跡用パスジェネレータ
      svg: undefined, // svg領域
      g: undefined, // svg配下に作るグループ
      miura: undefined, // 三浦半島の地図
      landmark: undefined, // ランドマークのJavascriptオブジェクト
      boat: undefined, // ボートの航路（背景側）
      boat2: undefined, // ボートの航路（軌跡側）
      boatTotalLength: undefined, // boat2.node().getTotalLength();
      interpolateString: undefined, // d3.interpolateString('0,' + l, l + ',' + l);
      marker: undefined, // 移動軌跡の先頭の●
      coordtext: undefined, // 座標を表示するテキスト
      setMarkerPosition: function() {} // マーカーを指定の場所に移動する関数
    };

    function makeMap() {
      // プロトタイプからmapオブジェクトを作成
      map = Object.create(proto_map);

      // コンテナの大きさに合わせる
      map.w = stateMap.$container.width();
      map.h = stateMap.$container.height();

      // 地図投影の指定（メルカトル図法）
      map.projection = d3.geo.mercator()
        .scale(map.scale)
        .translate(map.translate)
        .center(map.center);

      // 地形データのパスジェネレータ
      map.path = d3.geo.path().projection(map.projection);

      // ボートの軌跡用のパスジェネレータ。背景とは分ける必要あり。
      map.boatpath = d3.geo.path().projection(map.projection);

      // SVGの領域
      map.svg = d3.select(configMap.cname)
        .append('div')
        .classed('svg-container', true)
        .style('background', '#90D1FF') // 背景を海の色にする
        .append('svg')
        .attr('width', map.w)
        .attr('height', map.h);

      // SVG配下にグループgを作成
      map.g = map.svg.append('g').attr('id', 'all');

      // 座標を表示するテキスト領域
      map.coordtext = map.g.append('text').attr({
        x: 15,
        y: 70
      }).text('');

      // 0～1の間の値を引数にして位置をセットする
      map.setMarkerPosition = function(t) {
        map.boat2.attr('stroke-dasharray', function() {
          return map.getStrokeDashArray(t);
        });
      };

      // 破線の描画を工夫する。引数は0～1の間の数字。
      map.getStrokeDashArray = function(t) {
        // ボートの軌跡の全長
        var l = map.boatTotalLength; // = map.boat2.node().getTotalLength();

        // interpolateStringは端点を指定するとその間を補完してくれる関数を作成してくれる。
        // 中間点tを指定してi(t)を呼び出すと、中間点の長さ, トータル長、を得る。
        var i = map.interpolateString; // = d3.interpolateString('0,' + l, l + ',' + l);

        var drawlen = 60;
        var cols = i(t).split(','); // 文字列なのでコンマでスプリット。cols[0]が中間点、colos[1]が終点
        var result;
        if (cols[0] < drawlen) {
          result = i(t);
        } else {
          var hidden = cols[0] - drawlen;
          result = '0,' + hidden + ',' + drawlen + ',' + cols[1];
          // 書く、書かない、書く、書かない、の順に指定
        }
        // console.log(result);

        // マーカーを先頭に移動
        var p = map.boat2.node().getPointAtLength(t * l);
        // どの書き方でも結果は同じ。
        // d3.select('#marker').attr('transform', 'translate(' + p.x + ',' + p.y + ')');
        // map.marker.attr('transform', 'translate(' + p.x + ',' + p.y + ')');
        map.marker
          .attr({
            'cx': p.x,
            'cy': p.y
          });

        // GPS座標に変換するとそれがどこなのかを表示する
        var c = map.projection.invert([p.x, p.y]);
        c[0] = d3.format('.11g')(c[0]);
        c[1] = d3.format('.10g')(c[1]);
        map.coordtext.text(c);

        // 出発点から描画するなら単純にi(t)を戻せばよいが、ここでは破線のデータを返す
        return result;
      };
    }

    // 地図のフチにドロップシャドウをつける。見た目だけなのでなくてもよい。
    function setDropShadow() {
      var filter = map.svg.append('defs')
        .append('filter')
        .attr('id', 'drop-shadow')
        .attr('height', '110%');
      filter.append('feGaussianBlur')
        .attr('in', 'SourceAlpha')
        .attr('stdDeviation', 1)
        .attr('result', 'blur');
      filter.append('feOffset')
        .attr('in', 'blur')
        .attr('dx', 1)
        .attr('dy', 1)
        .attr('result', 'offsetBlur');
      var feMerge = filter.append('feMerge');
      feMerge.append('feMergeNode')
        .attr('in', 'offsetBlur');
      feMerge.append('feMergeNode')
        .attr('in', 'SourceGraphic');
    }

    function initMap() {
      // ------------------------
      // mapをオブジェクト化する
      // ------------------------

      makeMap();

      // ------------------------
      // SVG上に描画した地図の輪郭にドロップシャドウをつける
      // ------------------------

      setDropShadow();

      // ------------------------
      // データファイルの読み込み
      // ------------------------

      // 三浦の地図データ
      var mj = d3iida.heredoc.miura.data;
      map.geodata = topojson.feature(mj, mj.objects.miura).features;

      // ボートの軌跡データ
      var bj = a.heredoc.boat.data;
      // 必要なデータの名称はbj.objects.aburatsubo_20150110のようにファイルごとに変わってしまう
      // 最初の値であることが分かっているので、先頭のキーに対応する値を取り出す
      var key = Object.keys(bj.objects)[0];
      var boatdata = topojson.feature(bj, bj.objects[key]).features;

      // NY Timesのやり方ではデータ配列を都度slice()して一部だけを取り出して描画している。
      // slice()する場所をスライダーで変化させることで動いているように見せるのだが、データ配列全体の長さの入手と、尻尾の長さをどのくらいにするかの調整が難しい。
      // map.dataLength = boatdata[0].geometry.coordinates.length;で取れるのかな？
      // ここでは破線の書き方を工夫することで動いているように見せかける。

      // ------------------------
      // 描画
      // ------------------------

      map.miura = map.g.selectAll('.miura').data(map.geodata);
      map.miura
        .enter()
        .append('path') // insert?
        .attr('d', map.path)
        .attr('class', function(d) {
          return 'miura ' + d.properties.name;
        })
        .attr('fill', '#E9E5DC') // or #F0EDE5
        .attr('stroke', 'gray')
        .attr('stroke-width', 0.5)
        .style('filter', 'url(#drop-shadow)');

      map.landmark = map.g.selectAll('.landmark').data(landdata.features);
      map.landmark
        .enter()
        .append('path')
        .attr('class', 'landmark')
        .attr('fill', 'black') // CSSの読み込みに失敗すると黒くなるのでわかる
        .attr('d', map.path.pointRadius(function(d) {
          if (d.properties) {
            return d.properties.r;
          }
          return 4;
        }));

      map.landname = map.g.selectAll('.landname').data(landdata.features);
      map.landname
        .enter()
        .append('text')
        .attr('class', 'landname')
        .attr('transform', function(d) {
          return 'translate(' + map.path.centroid(d) + ')';
        })
        .attr('dx', '.35em')
        .attr('dy', '.35em')
        .text(function(d) {
          return d.properties.name;
        });

      map.boat = map.g.selectAll('.boat').data(boatdata);
      map.boat
        .enter()
        .append('path')
        .attr('d', map.boatpath)
        .attr('fill', 'none')
        .attr('stroke', 'gray')
        .attr('stroke-width', 0.4);

      map.boat2 = map.g.selectAll('.boat2').data(boatdata);
      map.boat2
        .enter()
        .append('path')
        .attr('d', map.boatpath)
        .attr('fill', 'none')
        .attr('stroke', 'purple')
        .attr('stroke-width', 1.2)
        .attr('stroke-dashoffset', 0)
        .attr('stroke-dasharray', function() {
          return '0,' + this.getTotalLength();
        }); // 書く長さ(=0), 書かない長さ(=全長)、の順

      // トランジション中に毎回処理するのは重いので、mapオブジェクトにキャッシュしておく。
      var l = map.boat2.node().getTotalLength();
      map.boatTotalLength = l;
      map.interpolateString = d3.interpolateString('0,' + l, l + ',' + l);

      // これを呼べば軌跡が動くが、スライダー側で動かすようにしたので、今は使っていない
      // map.boat2.call(transition);

      // マーカーの●を作る
      map.marker = map.g.append('circle').attr('r', 5).attr('fill', 'purple').attr('id', 'marker');
    } // end of initMap()

    // スライダーを作る
    // スライダーに対してtransition()をかけてボートの軌跡を動かす
    function initSlider() {
      // ブラシ領域の高さ。正確に●をクリックしなくても大丈夫。
      var brushHeight = 60;

      // ブラシの幅
      var brushWidth = map.w;

      // 0～1の数字で扱うように正規化したほうが楽
      var minValue = 0;
      var maxValue = 1;
      var currentValue = 1;
      var targetValue = 1;

      // スライダーをクリックした時にスムーズに動くようにする
      var alpha = 0.25;
      var moving;
      var move;

      var duration = map.duration;
      var svg = map.g;

      var playButton = d3.select(configMap.bname);

      // スライダーの描画に使う関数 x = i(n){return n(o);}
      var x = d3.scale.linear()
        .domain([0, maxValue]) // 実の数
        .range([100, brushWidth - 250]) // 左に100px、右に250pxの隙間を作る
        .clamp(true); // この値の中に強制的に収める

      var xTicks = {
        '0': 'start',
        '1': 'end'
      };

      // ハンドルの●を表すd3オブジェクト
      var handle;

      // ブラシ
      var brush = d3.svg.brush()
        .x(x)
        .extent([0, 0])
        .on('brush', function() { // ブラシイベント
          var value = brush.extent()[0];
          if (d3.event.sourceEvent) { // プログラムによるイベントではない場合、見た目の調整だけ実行
            if (d3.event.sourceEvent.target.parentNode === this) { // クリックイベントの場合
              playButton.text('開始');
              // ジャンプ移動するのではなく、なめらかに移動する
              targetValue = x.invert(d3.mouse(this)[0]);
              move();
            }
          } else {
            // プログラムによるイベントはここで処理する
            currentValue = brush.extent()[0];
            handle.attr('cx', x(currentValue)); // ハンドルの●をx()ドメインに合わせて移動

            // ●を移動する
            map.setMarkerPosition(currentValue);

            // 潮汐グラフの縦線と●を移動する
            if (d3iida.aburatsuboat.tidedata && tideMap.path) {
              setTideLine(currentValue);
            }
          }
        });

      // X軸を作成
      svg.append('g')
        .attr('class', 'slider_axis')
        .attr('transform', 'translate(0,' + brushHeight / 2 + ')')
        .call(d3.svg.axis()
          .scale(x)
          .orient('bottom')
          .tickFormat(function(t) {
            // メモリを表示しない場合はreturn '';
            return xTicks[t] || '';
          })
          .tickSize(12, 0)
          .tickPadding(0))
        .select('.domain') // domainとhaloはスライダーの横軸の見た目の調整
        .select(function() {
          return this.parentNode.appendChild(this.cloneNode(true));
        })
        .attr('class', 'halo');

      // スライダーのグループ'g'を作成し、ブラシを収める
      var slider = svg.append('g')
        .attr('class', 'slider')
        .call(brush);

      slider.selectAll('.extent,.resize').remove();

      // スライダーの高さ指定
      slider.select('.background')
        .attr('height', brushHeight);

      // ●の描画
      handle = slider.append('circle')
        .attr('class', 'handle')
        .attr('transform', 'translate(0,' + brushHeight / 2 + ')')
        .attr('r', 8);

      slider
        .call(brush.extent([0.0, 0.0]))
        .call(brush.event);

      var paused = function() {
        if (slider.node().__transition__) {
          // トランジション中なら、それを止める
          slider.interrupt();
          this.textContent = '開始';
        } else {
          if (currentValue === maxValue) {
            // 一番右まで行っているなら最初から
            slider
              .call(brush.extent([currentValue = minValue, currentValue]))
              .call(brush.event);
          }
          targetValue = maxValue;
          slider.transition()
            .duration((targetValue - currentValue) / (targetValue - minValue) * duration)
            .ease('linear')
            .call(brush.extent([targetValue, targetValue]))
            .call(brush.event)
            .each('end', function() {
              playButton.text('開始');
            });

          this.textContent = '停止';
        }
      };

      // 起動と同時にpausedが呼ばれる
      playButton
        .on('click', paused)
        .each(paused);

      // クリックで移動する場合に、イベントを発行しながら移動する
      move = function() {
        var copyValue = currentValue; // detect interrupt
        if (moving) {
          return false;
        }
        moving = true;

        d3.timer(function() { // trueを返すまでこのタイマーは回る
          if (copyValue !== currentValue) {
            moving = false;
            return true; // 終了
          }

          copyValue = currentValue = Math.abs(currentValue - targetValue) < 1e-3 ? targetValue : targetValue * alpha + currentValue * (1 - alpha);

          slider
            .call(brush.extent([currentValue, currentValue]))
            .call(brush.event);

          moving = currentValue !== targetValue;

          return !moving;
        });
      };
    }

    // ---------------------------
    // ランドマークのオブジェクトデータ
    // 座標を指定して手作りしたもの。
    // ---------------------------
    landdata = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        id: '01',
        geometry: {
          type: 'Point',
          coordinates: [139.612233, 35.161624]
        },
        properties: {
          name: 'マリンパーク',
          r: 15
        }
      }, {
        type: 'Feature',
        id: '02',
        geometry: {
          type: 'Point',
          coordinates: [139.615390, 35.161468]
        },
        properties: {
          name: 'みなとや',
          r: 4
        }
      }, {
        type: 'Feature',
        id: '03',
        geometry: {
          type: 'Point',
          coordinates: [139.620395, 35.162649]
        },
        properties: {
          name: 'シーボニア',
          r: 4
        }
      }, {
        type: 'Feature',
        id: '04',
        geometry: {
          type: 'Point',
          coordinates: [139.612059, 35.159176]
        },
        properties: {
          name: '荒井浜海水浴場',
          r: 4
        }
      }, {
        type: 'Feature',
        id: '05',
        geometry: {
          type: 'Point',
          coordinates: [139.616393, 35.164210]
        },
        properties: {
          name: '小網代湾',
          r: 0
        }
      }]
    };

    // ブラウザの大きさが変化したら
    resized = function() {
      if (stateMap.$container === undefined || stateMap.$container === null) {
        return;
      }
      map.w = stateMap.$container.width();
      map.h = stateMap.$container.height();

      if (map.svg !== undefined) {
        map.svg.attr('width', map.w);
        map.svg.attr('height', map.h);
      }
      if (map.layer !== undefined) {
        map.layer.attr('width', map.w);
        map.layer.attr('height', map.h);
      }
    };

    // 2015.04.21
    // コンパスを書いてみる。
    var initCompass = function() {
      var compassContainer;
      compassContainer = map.g.append('g')
        .attr('class', 'compass')
        .attr('transform', 'translate(750,30)');

      compassContainer.append('circle')
        .attr('r', 12);

      compassContainer.append('text')
        .attr('dy', -16)
        .text('N');

      var compass;
      compass = compassContainer.append('g')
        .attr('class', 'compass');

      compass.append('line')
        .attr('x1', 0)
        .attr('y1', 10)
        .attr('x2', 0)
        .attr('y2', -10);

      compass.append('line')
        .attr('x1', 0)
        .attr('y1', -10)
        .attr('x2', -4)
        .attr('y2', -6);

      compass.append('line')
        .attr('x1', 0)
        .attr('y1', -10)
        .attr('x2', 4)
        .attr('y2', -6);

      // iを0～1、値を角度で返すようなデータがあれば、動的に回転させることができる
      // compass.attr('transform', function(d) { return 'rotate(' + (180 + d[i]) + ')'; });
    };

    // 2015.04.27
    // 潮汐グラフを書いてみる
    tideMap = {
      top: 330,
      left: 40,
      width: 400,
      height: 140,
      svg: undefined, // 潮汐グラフの'g'
      path: undefined, // 潮汐データのパス
      tline: undefined, // 現在時刻を表現する縦線のline()関数
      tpath: undefined, // 現在時刻を表現する縦線のpath()関数
      circle: undefined, // 時刻で変化する線と潮汐データとの交点の●
      tx: undefined // 0～1の値から潮汐グラフのX座標を得る関数
    };

    var initTide = function() {
      // <script>の指定をしていない場合は処理できない
      if (!d3iida.aburatsuboat.tidedata) {
        return;
      }

      var tideDatas = d3iida.aburatsuboat.tidedata.datas;

      // スケールと出力レンジの定義
      var x = d3.scale.linear()
        .range([0, tideMap.width]);

      var y = d3.scale.linear()
        .range([tideMap.height, 0]);

      // X軸の定義
      var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom');

      // Y軸の定義
      var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(5);

      // 塗りつぶしのarea関数定義
      var area = d3.svg.area()
        .x(function(d) {
          return x(d[0]);
        })
        .y0(tideMap.height)
        .y1(function(d) {
          return y(d[1]);
        })
        .interpolate('basis');

      // 線のline関数定義
      var line = d3.svg.line()
        .x(function(d) {
          return x(d[0]);
        })
        .y(function(d) {
          return y(d[1]);
        })
        .interpolate('basis');

      // データの[最小値, 最大値]の配列
      var xextent = d3.extent(tideDatas, function(d) {
        return d[0];
      });

      var yextent = d3.extent(tideDatas, function(d) {
        return d[1];
      });

      // データを入力ドメインとして設定
      x.domain(xextent);
      // y.domain(yextent);
      y.domain([-10, 150]); // 潮汐データの最小値と最大値はこんなものか。

      // svgの定義
      var svg = map.g.append('g')
        .attr('transform', 'translate(' + tideMap.left + ',' + tideMap.top + ')');

      // 保存しておく。
      tideMap.svg = svg;

      // x軸をsvgに表示
      svg.append('g')
        .attr('class', 'x tide_axis')
        .attr('transform', 'translate(0,' + tideMap.height + ')')
        .call(xAxis);

      // y軸をsvgに表示
      svg.append('g')
        .attr('class', 'y tide_axis')
        .call(yAxis)
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 6)
        .attr('dy', '.71em')
        .style('text-anchor', 'end')
        .text('潮位(cm)');

      // グリッドを表示
      svg.append('g')
        .attr('class', 'tide_grid')
        .call(yAxis
          .tickSize(-tideMap.width, 0, 0)
          .tickFormat('')
        );

      // path要素をsvgに表示し、折れ線グラフを設定
      svg.append('path')
        .datum(tideDatas)
        .attr('class', 'tide_area')
        .attr('d', area);

      // path要素をsvgに表示し、折れ線グラフを設定
      var path = svg.append('path')
        .datum(tideDatas)
        .attr('class', 'tide_line')
        .attr('d', line);

      // 保存しておく
      tideMap.path = path;

      // --- グラフ表示だけならここまで

      // 時間で移動する縦線を表示したい
      // 入力ドメインを0～1として、出力レンジを実際の時刻に変換するスケールを作成。
      // 0を指定したときが7時、1を指定したときが13時、というようにする。
      var tscale = d3.scale.linear()
        .domain([0, 1])
        .range(d3iida.aburatsuboat.tidedata.range); // 例えば[7, 14]

      // さらにX座標が画面上のどこにくるかをxレンジで調べる関数を作る
      var tx = function(i) {
        return x(tscale(i));
      };

      // 保存しておく
      tideMap.tx = tx;

      // 初期値
      var t = 0.0;
      var tx1 = tx(t);
      var ty1 = 0;
      var tx2 = tx(t);
      var ty2 = tideMap.height;
      var tdata = [
        [tx1, ty1],
        [tx2, ty2]
      ];

      var tline = d3.svg.line()
        .x(function(d) {
          return d[0];
        })
        .y(function(d) {
          return d[1];
        });

      // 保存しておく
      tideMap.tline = tline;

      var tpath = svg.append('path')
        .attr('d', tline(tdata))
        .attr('class', 'tide_timeline');

      // 保存しておく
      tideMap.tpath = tpath;

      var circle = svg.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', '6')
        .attr('class', 'tide_circle');

      // 保存しておく
      tideMap.circle = circle;

      // 0すなわち7時のところに線を引く。あとはこれを移動する。
      setTideLine(0);
    };

    // 0～1を引数にして現在時刻の縦線を移動する
    setTideLine = function(i) {
      var pathEl = tideMap.path.node();
      var pathLength = pathEl.getTotalLength();

      // パス上の位置は探るしかない。
      // accuracyは小さい方が正確だけどループから抜けるのに時間がかかる。
      // ●の半径が6なので、その半分に収まればよいものとする
      var accuracy = 3;

      var x = tideMap.tx(i);
      var j;
      var pos;
      for (j = x; j < pathLength; j += accuracy) {
        pos = pathEl.getPointAtLength(j);
        if (pos.x >= x) {
          break;
        }
      }

      tideMap.circle
        .attr('cx', x)
        .attr('cy', pos.y);

      var tdata = [
        [x, 0],
        [x, tideMap.height]
      ];

      tideMap.tpath
        .attr('d', tideMap.tline(tdata));
    };

    // このモジュールを初期化
    initModule = function($container) {
      // stateMapに保管しておく
      stateMap.$container = $container;

      // HTMLを書き込む
      $container.html(configMap.html);

      // 地図を初期化
      initMap();

      // スライダーを初期化
      initSlider();

      // コンパスを初期化
      initCompass();

      // 潮汐データをグラフ化
      initTide();
    };

    // 外部公開
    return {
      initModule: initModule,
      resized: resized
    };
  };
  //
})();
