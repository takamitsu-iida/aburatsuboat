/* global d3, topojson, aburatsuboat */

/*
 * aburatsubo.mapChart.js
 * takamitsu.iida@gmail.com
 *
 * 2015.03.15 初版
 * 2015.04.16 d3.slider.jsの利用をやめて組み込みに変更
 * 2015.04.27 潮汐グラフを追加
 * 2016.10.31 d3 v4用に書き換え
 */

// NY Timesのやり方ではデータ配列を都度slice()して一部だけを取り出して描画している。
// slice()する場所をスライダーで変化させることで動いているように見せるのだが、
// データ配列全体の長さの入手と、尻尾の長さをどのくらいにするかの調整が難しい。
// dataLength = boatdata[0].geometry.coordinates.length;で取れるのかも？
// ここでは簡単なやり方として、破線の書き方を工夫することで動いているように見せかける。

(function() {
  aburatsuboat.mapChart = function module() {
    // カスタムイベントを登録する
    var dispatch = d3.dispatch('brushing');

    // 一番上位のsvgを選択するセレクタ
    var svg = d3.select(null);

    // SVGの枠の大きさ
    var width = 800;
    var height = 500;

    // 'g'の描画領域となるデフォルトのマージン
    var margin = {
      top: 5,
      right: 5,
      bottom: 5,
      left: 5
    };

    // 描画領域のサイズw, h
    // マージンの分だけ小さくしておく。
    var w = width - margin.left - margin.right;
    var h = height - margin.top - margin.bottom;

    // 地図の縮尺
    // 小さいほど広域が表示される
    // 画面サイズと合わせて調整が必要で、経験則的に決める必要がある
    var scaleSize = 1500000;

    // 地図のtopojson
    // 地図のtopojsonデータから取り出したfeatures
    var geodataMiura = aburatsuboat.geodata.miura;
    var featuresMiura = topojson.feature(geodataMiura, geodataMiura.objects.miura).features;

    // ランドマークのfeatures
    var featuresLandmark = aburatsuboat.geodata.landmark.features;

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

    // 0～1の間の値を引数にしてマーカーの位置をセットする
    function setMarkerPosition(t) {
      boat2.attr('stroke-dasharray', function() {
        return getStrokeDashArray(t);
      });
    }

    // ボートの航路の全長
    // call()されたときに渡されるデータで計算する
    var boatTotalLength; // boat2.node().getTotalLength();

    // 補完関数
    // ボートの航路の全長が決まらないと作れないので、これもcall()されたときに作成
    var interpolateString; // d3.interpolateString('0,' + l, l + ',' + l);

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

      // 出発点から描画するなら単純にi(t)を戻せばよいが、ここでは破線のデータを返す
      return result;
    }

    // スライダを起動するボタンへのセレクタ
    var playButton;

    // このモジュールをcall()したコンテナ
    var container;

    // コンテナに紐付いているデータ
    // ボートの軌跡データが紐付いていると想定
    var featuresBoat;

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

        // 変数名を分かりやすいものに戻す
        container = _selection;
        featuresBoat = _data;

        // 都市選択用のHTMLを追加する
        initPlayButton();

        // ダミーデータを紐付けることで重複作成を防止する
        var svgAll = container.selectAll('svg').data(['dummy']);

        // ENTER領域にsvgを作成
        svgAll.enter()
          .append('svg')
          .attr('preserveAspectRatio', 'xMinYMin meet')
          .attr('viewBox', '0 0 ' + width + ' ' + height)
          .style('overflow', 'hidden')
          .style('background', '#90D1FF') // 背景を海の色にする
          .classed('svg-content-responsive', true)
          .merge(svgAll)
          .attr('width', width)
          .attr('height', height);

        // 最上位のsvgを選択するセレクタ
        svg = container.select('svg');

        initMapLayer();
        initBoatLayer(featuresBoat);
        initSliderLayer();

        //
      });
    }

    function initPlayButton() {
      container.selectAll('.graphic').data(['dummy'])
        .enter()
        .append('div')
        .classed('graphic', true)
        .append('button')
        .text('開始')
        .attr('id', 'play-button');

      playButton = container.select('#play-button');
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
      // CSSファイルも見ること
      // 地図を描画するレイヤ 'g'
      var mapLayerAll = svg.selectAll('.mapLayer').data(['dummy']);
      mapLayerAll
        .enter()
        .append('g')
        .classed('mapLayer', true)
        .merge(mapLayerAll)
        .attr('width', w)
        .attr('height', h)
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      // mapLayerに緯度経度を表示するテキスト領域を追加
      var coordtextAll = svg.select('.mapLayer').selectAll('.coordtext').data(['dummy']);
      coordtextAll
        .enter()
        .append('text')
        .classed('coordtext', true)
        .merge(coordtextAll)
        .attr('x', 15)
        .attr('y', 70)
        .text('');

      // mapLayerに地図のパスを追加
      var miuraAll = svg.select('.mapLayer').selectAll('.miura').data(featuresMiura);
      miuraAll
        .enter()
        .append('path')
        .attr('d', geoPath)
        .attr('class', function(d) {
          return 'miura ' + d.properties.name;
        })
        .attr('fill', '#E9E5DC') // or #F0EDE5
        .attr('stroke', 'gray')
        .attr('stroke-width', 0.5)
        .style('filter', 'url(#drop-shadow)');

      miuraAll
        .attr('d', geoPath);

      miuraAll
        .exit()
        .remove();

      // mapLayerにランドマークを描画
      var landmarkAll = svg.select('.mapLayer').selectAll('.landmark').data(featuresLandmark);
      landmarkAll
        .enter()
        .append('path')
        .classed('landmark', true)
        .attr('fill', 'black') // CSSの読み込みに失敗すると黒くなるのでわかる
        .merge(landmarkAll)
        .attr('d', geoPath.pointRadius(function(d) {
          if (d.properties) {
            return d.properties.r;
          }
          return 4;
        }));

      landmarkAll
        .exit()
        .remove();

      var landnameAll = svg.select('.mapLayer').selectAll('.landname').data(featuresLandmark);
      landnameAll
        .enter()
        .append('text')
        .classed('landname', true)
        .attr('dx', '.35em')
        .attr('dy', '.35em')
        .merge(landnameAll)
        .attr('transform', function(d) {
          return 'translate(' + geoPath.centroid(d) + ')';
        })
        .text(function(d) {
          return d.properties.name;
        });
      //
    }

    // ボートの航路を表示するレイヤを作成する
    function initBoatLayer(featuresBoat) {
      // ボートの航路を描画するレイヤ 'g'
      var boatLayerAll = svg.selectAll('.boatLayer').data(['dummy']);
      boatLayerAll
        .enter()
        .append('g')
        .classed('boatLayer', true)
        .merge(boatLayerAll)
        .attr('width', w)
        .attr('height', h)
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      // ボートの軌跡を描画する
      // 常時表示
      svg.select('.boatLayer').selectAll('.boat').data(featuresBoat)
        .enter()
        .append('path')
        .attr('d', boatPath)
        .attr('fill', 'none')
        .attr('stroke', 'gray')
        .attr('stroke-width', 0.4)
        .classed('boat', true);

      // 同じボートの軌跡を重ねて描画し、破線を工夫して動いているように見せかける
      boat2 = svg.select('.boatLayer').selectAll('.boat2').data(featuresBoat)
        .enter()
        .append('path')
        .attr('d', boatPath)
        .attr('fill', 'none')
        .attr('stroke', 'purple')
        .attr('stroke-width', 1.2)
        .attr('stroke-dashoffset', 0)
        .attr('stroke-dasharray', function() {
          // 書く長さ(=0), 書かない長さ(=全長)、の順
          return '0,' + this.getTotalLength();
        })
        .classed('boat2', true);

      // トランジション中に毎回計算するのは重いので、インスタンス変数に保持しておく
      var l = boat2.node().getTotalLength();
      boatTotalLength = l;
      interpolateString = d3.interpolateString('0,' + l, l + ',' + l);

      // マーカーの●を作る
      var markerAll = svg.select('.boatLayer').selectAll('.marker').data(['dummy']);
      markerAll
        .enter()
        .append('circle')
        .attr('r', 5)
        .attr('fill', 'purple')
        .classed('marker', true);

      marker = svg.select('.boatLayer').select('.marker');
      //
    }

    // スライダを作る
    function initSliderLayer() {
      // ブラシの左右マージン
      var brushMargin = {left: 100, right: 250};

      // ブラシ領域の高さ。正確に●をクリックしなくても大丈夫。
      var brushHeight = 60;

      // ブラシの幅
      var brushWidth = w;


      // 0～1の数字で扱うように正規化する
      var minValue = 0;
      var maxValue = 1;
      var currentValue = 1;
      var targetValue = 1;

      // スライダーをクリックした時にスムーズに動くようにする
      var alpha = 0.25;
      var moving;
      var move;

      // 最初から最後まで移動するのに要する時間(20秒)
      var duration = 20000;

      // スケール関数
      var xScale = d3.scaleLinear()
        .domain([minValue, maxValue])
        .range([100, brushWidth - 250]) // 左に100px、右に250pxの隙間を作る
        .clamp(true); // この値の中に強制的に収める

      var xTicks = {
        0: 'start',
        1: 'end'
      };

      // ハンドルの●を表すd3オブジェクト
      var handle;

      // ブラシ
      var brush = d3.brushX()
        .extent([[100, 0], [brushWidth - 250, brushHeight]])
        .on('brush', function() {
           // マウス操作によるイベントの場合、パラメータ調整だけ実行
          if (d3.event.sourceEvent) {
            if (d3.event.sourceEvent.target.parentNode === this) { // クリックイベントの場合
              playButton.text('開始');
              // ジャンプ移動するのではなく、なめらかに移動する
              targetValue = xScale.invert(d3.mouse(this)[0]);
              move();
            }
          } else {
            // プログラムによるイベントはここで処理する
            currentValue = brush.extent()[0];
            handle.attr('cx', xScale(currentValue)); // ハンドルの●をxScaleに合わせて移動

            // ●を移動する
            setMarkerPosition(currentValue);

            // 潮汐グラフの縦線と●を移動する
            /*
            if (aburatsuboat.tidedata.datas && tideMap.path) {
              setTideLine(currentValue);
            }
            */
          }
        });

      // スライダを描画するレイヤ 'g'
      var sliderLayerAll = svg.selectAll('.sliderLayer').data(['dummy']);
      sliderLayerAll
        .enter()
        .append('g')
        .classed('sliderLayer', true)
        .merge(sliderLayerAll)
        .attr('width', w)
        .attr('height', h)
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      // X軸を作成
      var xaxis = d3.axisBottom(xScale)
        // 両端のtick線なし、内側のtick線なし
        .tickSize(0, 0)
        // 文字を下に12ズラす
        .tickPadding(12)
        // tick数は1、つまり最初をのぞいて最後の1個だけなので、startとendの文字だけになる
        .ticks(1)
        .tickFormat(function(t) {
          return xTicks[t] || '';
        });

      // 軸の描画領域'g'を作って、call(xaxis)する
      // 軸はpathで描画されていて、v3の時はきれいに角が取れていたのに、v4は角がちょっと残る
      //   ┌──────────────────┐
      var sliderAxisAll = svg.select('.sliderLayer').selectAll('.slider_axis').data(['dummy']);
      sliderAxisAll
        .enter()
        .append('g')
        .attr('class', 'slider_axis')
        .merge(sliderAxisAll)
        .attr('transform', 'translate(0,' + brushHeight / 2 + ')')
        .call(xaxis)
        .select('.domain') // domainとhaloはスライダーの横軸の見た目の調整
        .select(function() {
          // domainクラスを持つラインを複写して、新たにharoクラスを名付ける
          // domain側を太く、haloを細くすることで、フチドリされた線にする
          return this.parentNode.appendChild(this.cloneNode(true));
        })
        .attr('class', 'halo');

      // スライダーのグループ"g"を作成し、call(brush)する
      var sliderAll = svg.select('.sliderLayer').selectAll('.slider').data(['dummy']);
      sliderAll
        .enter()
        .append('g')
        .classed('slider', true)
        .call(brush);

      var slider = svg.select('.slider');

      slider
        .selectAll('.selection,.handle')
        .remove();

      // ●の描画
      var handleAll = svg.select('.slider').selectAll('.handle').data(['dummy']);
      handle = handleAll
        .enter()
        .append('circle')
        .classed('handle', true)
        .attr('transform', 'translate(100,' + brushHeight / 2 + ')')
        .attr('r', 8);

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
      /*
      playButton
        .on('click', paused)
        .each(paused);
      */

      // クリックで移動する場合に、イベントを発行しながら移動する
      move = function() {
        var copyValue = currentValue;
        if (moving) {
          return false;
        }
        moving = true;

        console.log(copyValue);

        d3.timer(function() { // trueを返すまでこのタイマーは回る
          if (copyValue !== currentValue) {
            moving = false;
            return true; // 終了
          }

          copyValue = currentValue = Math.abs(currentValue - targetValue) < 1e-3 ? targetValue : targetValue * alpha + currentValue * (1 - alpha);

          slider
            .call(brush.extent([currentValue, currentValue]));

          moving = currentValue !== targetValue;

          return !moving;
        });
      };
      //
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
      return this;
    };

    exports.scaleSize = function(_) {
      if (!arguments.length) {
        return scaleSize;
      }
      scaleSize = _;
      return this;
    };

    // カスタムイベントを'on'で発火できるようにリバインドする
    // v3までのやり方
    // d3.rebind(exports, dispatch, 'on');
    // v4のやり方
    exports.on = function() {
      var value = dispatch.on.apply(dispatch, arguments);
      return value === dispatch ? exports : value;
    };

    return exports;
  };

  // 使い方  <div id='aburatsuboat'></div>内に地図を描画する
  aburatsuboat.mapChart.example = function() {
    var container = d3.select('#aburatsuboat');

    // ボートの軌跡データ
    // 取り出したいデータ名はobjects.aburatsubo_20150110のようにファイルごとに変わってしまう
    // 最初の値であることが分かっているので、先頭のキーを取り出して、それに対応する値を取り出す
    var key = Object.keys(aburatsuboat.geodata.boat.objects)[0];
    var geodataBoat = aburatsuboat.geodata.boat;
    var featuresBoat = topojson.feature(geodataBoat, geodataBoat.objects[key]).features;

    // mapChartをインスタンス化する
    var chart = aburatsuboat.mapChart().width(800).height(500);

    // コンテナにボートデータを紐付けてcall()する
    container.datum(featuresBoat).call(chart);

   //
  };
  //
})();
