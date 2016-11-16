/* global d3, topojson, aburatsuboat */

/*
 * aburatsubo.mapChart.js
 * takamitsu.iida@gmail.com
 *
 * 2016.11.19 d3.js v4用に書き換え
 */

// NY Timesのやり方ではデータ配列を都度slice()して一部だけを取り出して描画している。
// slice()する場所をスライダーで変化させることで動いているように見せるのだが、
// ここで扱うデータは配列ではなく、topojsonで変換したpathなので、
// ここでは簡単なやり方として、破線の書き方を工夫することで動いているように見せかける。

(function() {
  aburatsuboat.mapChart = function module() {
    // 一番上位のsvgを選択するセレクタ
    var svg;

    // SVGの枠の大きさ
    var width = 800;
    var height = 500;

    // 地図を描画するレイヤ'g'のマージン
    // 軸とか描くわけではないので、SVG領域いっぱいまで広げておく
    var margin = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    };

    // 描画領域のサイズw, h
    // マージンの分だけ小さく
    var w = width - margin.left - margin.right;
    var h = height - margin.top - margin.bottom;

    // 地図の縮尺
    // 小さいほど広域が表示される
    // 画面サイズと合わせて調整が必要で、経験則的に決める必要がある
    var scaleSize = 1500000;

    // 地図の中心点
    var center = [139.61, 35.162];

    // メルカトル図法のプロジェクション
    var projection = d3.geoMercator()
      .scale(scaleSize)
      .translate([w / 2, h / 2])
      .center(center);

    // 地図のパスジェネレータ
    var geoPath = d3.geoPath().projection(projection);

    // ボートの航路のパスジェネレータ
    var boatPath = d3.geoPath().projection(projection);

    // セレクションのキャッシュ
    var boat2; // 破線を工夫して動いているように見せかける方のパス
    var coordtext; // 座標を表示するテキスト
    var marker; // 移動軌跡の先頭の●

    // tideChartモジュールのインスタンス
    var tideChart = aburatsuboat.tideChart();

    // スライダモジュールのインスタンス
    // 'hue'イベントの捕捉は最後に実行
    var slider = aburatsuboat.slider();

    // call()時に渡されるデータ
    var featuresBoat; // ボートの軌跡データのfeatures
    var tideDatas; // 潮汐データ
    var timeDomain; // 時刻の入力ドメイン

    //
    // call()されたときに呼ばれる公開関数
    //
    function exports(_selection) {
      _selection.each(function(_data) {
        // nullをバインドしてcall()されたら、描画済みのsvgを全て削除する
        if (!_data) {
          d3.select(this).select('svg').remove();
          return;
        }

        // パッキングされたデータをバラす
        // aburatsuboat.startup.jsを参照
        tideDatas = _data.tideDatas;
        timeDomain = _data.timeDomain;
        featuresBoat = _data.featuresBoat;

        // SVGを一つ作成する
        var svgAll = _selection.selectAll('svg').data(['dummy']);
        svg = svgAll
          .enter()
          .append('svg')
          .attr('preserveAspectRatio', 'xMinYMin meet')
          .attr('viewBox', '0 0 ' + width + ' ' + height)
          .style('overflow', 'hidden')
          .style('background', '#90D1FF') // 背景を海の色にする
          .classed('svg-content-responsive', true)
          .merge(svgAll)
          .attr('width', width)
          .attr('height', height);

        initMapLayer();
        initCompass();
        initBoatLayer();
        initTideChart();
        initSlider();

        // スライダの 'hue' イベントを捕捉する
        slider.on('hue', function(d) {
          setMarkerPosition(d);
          tideChart.setTimeline(d);
        });

        slider.pause();
        //
      });
    }

    function initMapLayer() {
      // drop-shadowフィルタを作成しておく
      var filter = svg.append('defs')
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

      // 地図を描画するレイヤ 'g'
      var mapLayerAll = svg.selectAll('.ab-map-layer').data(['dummy']);
      var mapLayer = mapLayerAll
        .enter()
        .append('g')
        .classed('ab-map-layer', true)
        .merge(mapLayerAll)
        .attr('width', w)
        .attr('height', h)
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      // mapLayerに緯度経度を表示するテキスト領域を追加
      var coordtextAll = mapLayer.selectAll('.ab-map-coordtext').data(['dummy']);
      coordtext = coordtextAll
        .enter()
        .append('text')
        .classed('ab-map-coordtext', true)
        .merge(coordtextAll)
        .attr('x', 20)
        .attr('y', 80)
        .text('');

      // 地図のtopojsonデータをグローバル空間から取り出す
      var geodataMiura = aburatsuboat.geodata.miura;

      // 取り出したfeatures
      var featuresMiura = topojson.feature(geodataMiura, geodataMiura.objects.miura).features;

      // mapLayerに地図のパスを追加
      var miuraAll = mapLayer.selectAll('.ab-map-miura').data(featuresMiura);
      miuraAll
        .enter()
        .append('path')
        .attr('class', function(d) {
          return 'ab-map-miura ' + d.properties.name;
        })
        .merge(miuraAll)
        .attr('d', geoPath)
        .attr('fill', '#E9E5DC') // or #F0EDE5
        .attr('stroke', 'gray')
        .attr('stroke-width', 0.5)
        .style('filter', 'url(#drop-shadow)');

      miuraAll.exit().remove(); // 存在しないはず

      // ランドマークのfeaturesはグローバル空間から取り出す
      var featuresLandmark = aburatsuboat.geodata.landmark.features;

      // mapLayerにランドマークを描画
      var landmarkAll = mapLayer.selectAll('.ab-map-landmark').data(featuresLandmark);
      landmarkAll
        .enter()
        .append('path')
        .classed('ab-map-landmark', true)
        .merge(landmarkAll)
        .attr('d', geoPath.pointRadius(function(d) {
          if (d.properties) {
            return d.properties.r;
          }
          return 4;
        }));

      landmarkAll.exit().remove(); // 存在しないはず

      var landnameAll = mapLayer.selectAll('.ab-map-landname').data(featuresLandmark);
      landnameAll
        .enter()
        .append('text')
        .classed('ab-map-landname', true)
        .merge(landnameAll)
        .attr('dx', '.75em')
        .attr('dy', '.35em')
        .attr('transform', function(d) {
          return 'translate(' + geoPath.centroid(d) + ')';
        })
        .text(function(d) {
          return d.properties.name;
        });
      //
    }

    // ボートの軌跡の全長をキャッシュする
    var boatTotalLength; // boat2.node().getTotalLength();

    // 補完関数
    // ボートの航路の全長が決まらないと作れないので、これもcall()されたときに作成
    var interpolateString; // d3.interpolateString('0,' + l, l + ',' + l);

    // ボートの航路を表示するレイヤを作成する
    function initBoatLayer() {
      // ボートの航路を描画するレイヤ 'g'
      var boatLayerAll = svg.selectAll('.ab-boat-layer').data(['dummy']);
      var boatLayer = boatLayerAll
        .enter()
        .append('g')
        .classed('ab-boat-layer', true)
        .merge(boatLayerAll)
        .attr('width', w)
        .attr('height', h)
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      // ボートの軌跡を描画する
      // 常時表示
      var boatAll = boatLayer.selectAll('.ab-boat-path').data(featuresBoat);
      boatAll
        .enter()
        .append('path')
        .classed('ab-boat-path', true)
        .merge(boatAll)
        .attr('d', boatPath)
        .attr('fill', 'none')
        .attr('stroke', 'gray')
        .attr('stroke-width', 0.4);

      // 同じボートの軌跡を重ねて描画し、破線を工夫して動いているように見せかける
      var boat2All = boatLayer.selectAll('.ab-boat-path2').data(featuresBoat);
      boat2 = boat2All
        .enter()
        .append('path')
        .classed('ab-boat-path2', true)
        .merge(boat2All)
        .attr('d', boatPath)
        .attr('fill', 'none')
        .attr('stroke', 'purple')
        .attr('stroke-width', 1.2)
        .attr('stroke-dashoffset', 0)
        .attr('stroke-dasharray', function() {
          // 書く長さ(=0), 書かない長さ(=全長)、の順
          return '0,' + this.getTotalLength();
        });

      // トランジション中に毎回計算するのは重いので、インスタンス変数に保持しておく
      var l = boatTotalLength = boat2.node().getTotalLength();
      interpolateString = d3.interpolateString('0,' + l, l + ',' + l);

      // マーカーの●を作る
      var markerAll = boatLayer.selectAll('.ab-boat-marker').data(['dummy']);
      marker = markerAll
        .enter()
        .append('circle')
        .classed('ab-boat-marker', true)
        .merge(markerAll)
        .attr('r', 5)
        .attr('fill', 'purple');

      // マーカーの位置を初期化する
      setMarkerPosition(0);
    }

    // 0～1の間の値を引数にしてマーカーの位置をセットする
    function setMarkerPosition(t) {
      boat2.attr('stroke-dasharray', function() {
        return getStrokeDashArray(t);
      });
    }

    // 引数tは0～1の間の数字を受け取り、
    // tの数字に応じて破線を描画する
    // あわせてマーカーを移動し、マーカー位置の緯度経度の数字も直す
    function getStrokeDashArray(t) {
      // ボートの軌跡の全長
      var l = boatTotalLength;

      // interpolateStringは端点を指定するとその間を補完してくれる関数を作成してくれる。
      // 中間点tを指定してi(t)を呼び出すと、中間点の長さ, トータル長、を得る。
      var i = interpolateString; // = d3.interpolateString('0,' + l, l + ',' + l);

      // 尻尾の長さ
      var drawlen = 60;
      var cols = i(t).split(','); // 文字列なのでコンマでスプリット。cols[0]が中間点、colos[1]が終点

      // 戻り値
      var result;
      if (cols[0] < drawlen) {
        // 開始直後で尻尾の長さが短い場合
        result = i(t);
      } else {
        // 時間が経って尻尾の長さ分だけ描画する場合
        var hidden = cols[0] - drawlen;
        result = '0,' + hidden + ',' + drawlen + ',' + cols[1];
        // 書く、書かない、書く、書かない、の順に指定
      }
      // console.log(result);

      // マーカーを先頭に移動
      var p = boat2.node().getPointAtLength(t * l);

      // どの書き方でも結果は同じ。
      // d3.select('#marker').attr('transform', 'translate(' + p.x + ',' + p.y + ')');
      // map.marker.attr('transform', 'translate(' + p.x + ',' + p.y + ')');
      marker
        .attr('cx', p.x)
        .attr('cy', p.y);

      // GPS座標に変換するとそれがどこなのかを表示する
      var c = projection.invert([p.x, p.y]);
      c[0] = d3.format('.11g')(c[0]);
      c[1] = d3.format('.10g')(c[1]);
      coordtext.text(c);

      // 出発点から描画するなら単純にi(t)を戻せばよいが、尻尾の都合上、作成した破線を返す
      return result;
    }

    // スライダを作る
    function initSlider() {
      // レイヤにスライダモジュールを配置する領域'g'を作成する
      var sliderLayerAll = svg.selectAll('.ab-slider-layer').data(['dummy']);
      var sliderLayer = sliderLayerAll
        // ENTER領域
        .enter()
        .append('g')
        .classed('ab-slider-layer', true)
        // ENTER + UPDATE領域
        .merge(sliderLayerAll);

      sliderLayer.call(slider);
      //
    }

    // 潮汐チャートを作る
    function initTideChart() {
      // チャートのデフォルトの高さを調べる
      var chartHeight = tideChart.height();

      // 潮汐データの最小値と最大値はこんなものかな
      tideChart.ydomain([-10, 150]);

      // Y軸のticksを調整する
      tideChart.yticks(5);

      // データをパッキングする
      var data = {
        tideDatas: tideDatas,
        timeDomain: timeDomain
      };

      var tideChartLayerAll = svg.selectAll('.ab-tidechart-layer').data(['dummy']);
      var tideChartLayer = tideChartLayerAll
        .enter()
        .append('g')
        .classed('ab-tidechart-layer', true)
        .merge(tideChartLayerAll)
        .attr('transform', 'translate(35,' + (h - chartHeight - 15) + ')');

      // コンテナのセレクションにデータを紐付けてcall()する
      tideChartLayer.datum(data).call(tideChart);
    }

    // コンパスの描画
    function initCompass() {
      // 機能的な意味はないので、SVGのパスを載せた方がいいかも
      var compassLayerAll = svg.selectAll('.ab-compass-layer').data(['dummy']);
      var compassLayer = compassLayerAll
        .enter()
        .append('g')
        .classed('ab-compass-layer', true)
        .merge(compassLayerAll)
        .attr('transform', 'translate(750,30)');

      var circleAll = compassLayer.selectAll('circle').data(['dummy']);
      circleAll
        .enter()
        .append('circle')
        .attr('r', 12);

      var textAll = compassLayer.selectAll('text').data(['N']);
      textAll
        .enter()
        .append('text')
        .attr('dy', -16)
        .text(function(d) {
          return d;
        });

      var lineG = compassLayer.selectAll('.ab-compass-line-g').data(['dummy']).enter().append('g').classed('ab-compass-line-g', true);
      lineG
        .append('line')
        .attr('x1', 0)
        .attr('y1', 10)
        .attr('x2', 0)
        .attr('y2', -10);
      lineG
        .append('line')
        .attr('x1', 0)
        .attr('y1', -10)
        .attr('x2', -4)
        .attr('y2', -6);
      lineG
        .append('line')
        .attr('x1', 0)
        .attr('y1', -10)
        .attr('x2', 4)
        .attr('y2', -6);

      // iを0～1、値を角度で返すようなデータがあれば、動的に回転させることができる
      // compass.attr('transform', function(d) { return 'rotate(' + (180 + d[i]) + ')'; });
    }

    exports.width = function(_) {
      if (!arguments.length) {
        return width;
      }
      width = _;
      w = width - margin.left - margin.right;
      projection.translate([w / 2, h / 2]);
      return this;
    };

    exports.height = function(_) {
      if (!arguments.length) {
        return height;
      }
      height = _;
      h = height - margin.top - margin.bottom;
      projection.translate([w / 2, h / 2]);
      return this;
    };

    exports.center = function(_) {
      if (!arguments.length) {
        return center;
      }
      center = _;
      projection.center(center);
      return this;
    };

    exports.scaleSize = function(_) {
      if (!arguments.length) {
        return scaleSize;
      }
      scaleSize = _;
      projection.scale(scaleSize);
      return this;
    };

    return exports;
  };
  //
})();
