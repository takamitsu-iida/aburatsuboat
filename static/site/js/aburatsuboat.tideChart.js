/* global d3, aburatsuboat */

// 2016.11.16
// Takamitsu IIDA

// スライダ付きラインモジュール
(function() {
  aburatsuboat.tideChart = function module(_accessor) {
    // svgを作る必要があるならインスタンス化するときにtrueを渡す
    var needsvg = arguments.length ? _accessor : false;

    //
    // クラス名定義
    //

    // チャートを配置するレイヤ
    var CLASS_CHART_LAYER = 'ab-tidechart-layer';

    // チャートのラインとエリア
    var CLASS_CHART_LINE = 'ab-tidechart-line'; // CSSでスタイル指定
    var CLASS_CHART_AREA = 'ab-tidechart-area'; // CSSでスタイル指定

    // タイムライン表示の縦線と丸
    var CLASS_TIMELINE = 'ab-tidechart-timeline'; // CSSでスタイル指定
    var CLASS_TCIRCLE = 'ab-tidechart-tcircle'; // CSSでスタイル指定

    // 外枠の大きさ
    var width = 420;
    var height = 160;

    // 描画領域のマージン
    var margin = {
      top: 0,
      right: 0,
      bottom: 20,
      left: 30
    };

    // 描画領域のサイズw, h
    // 軸や凡例がはみ出てしまうので、マージンの分だけ小さくしておく。
    var w = width - margin.left - margin.right;
    var h = height - margin.top - margin.bottom;

    // このモジュールをcall()したコンテナへのセレクタ
    var container;

    // チャートを描画するレイヤへのセレクタ
    var layer;

    // call()時に渡されたデータ
    var timeDomain;
    var tideDatas;

    // スケール関数とレンジ指定
    var xScale = d3.scaleLinear().range([0, w]);
    var yScale = d3.scaleLinear().range([h, 0]);

    // ドメイン指定は、データ入手後に行う
    var xdomain;
    var ydomain;

    // データの最小値・最大値を調べて入力ドメインを設定する
    function setDomain(data) {
      if (!xdomain) {
        // データの[最小値, 最大値]の配列
        var xextent = d3.extent(data, function(d) {
          return d[0];
        });
        xScale.domain(xextent);
      }
      if (!ydomain) {
        var yextent = d3.extent(data, function(d) {
          return d[1];
        });
        yScale.domain(yextent);
      }
    }

    // 軸に付与するticksパラメータ
    var xticks;
    var yticks;

    // 軸のテキスト
    var xAxisText = '時刻';
    var yAxisText = '潮位(cm)';

    // X軸
    var xaxis = d3.axisBottom(xScale); // .ticks(xticks);

    // Y軸
    var yaxis = d3.axisLeft(yScale); // .ticks(yticks);

    // X軸に付与するグリッドライン（Y軸と平行のグリッド線）
    var drawXGrid = false;
    function make_x_gridlines() {
      return d3.axisBottom(xScale);
    }

    // Y軸に付与するグリッドライン（X軸と平行のグリッド線）
    var drawYGrid = true;
    function make_y_gridlines() {
      return d3.axisLeft(yScale).ticks(yticks);
    }

    // ライン用のパスジェネレータ
    var line = d3.line().curve(d3.curveNatural);

    // ライン用のパスジェネレータで出力されたパス
    // タイムラインとの交点を探るのに必要
    var linePath;

    // 塗りつぶしエリアのパスジェネレータ
    var area = d3.area().curve(d3.curveNatural);

    // パスジェネレータにスケールを適用する関数
    // データは [[0, 107], [1, 102],
    // という構造を想定しているので、x軸はd[0]、y軸はd[1]になる
    function setScale() {
      // ライン用パスジェネレータにスケールを適用する
      line
        .x(function(d) {
          return xScale(d[0]);
        })
        .y(function(d) {
          return yScale(d[1]);
        });

      // エリア用パスジェネレータにスケールを適用する
      area
        .x(function(d) {
          return xScale(d[0]);
        })
        .y0(h)
        .y1(function(d) {
          return yScale(d[1]);
        });
      //
    }

    // 実際にパスジェネレータにスケールを適用するのは
    // データ入手後に軸のドメインを決めて、スケールを作り直してから
    // setScale();

    // レイヤにチャートを描画する
    function initChart() {
      // x軸を追加する
      var xAxisAll = layer.selectAll('.x-axis').data(['dummy']);
      xAxisAll
        // ENTER領域
        .enter()
        .append('g')
        .classed('x-axis', true)
        // ENTER + UPDATE領域
        .merge(xAxisAll)
        .attr('transform', 'translate(0,' + h + ')')
        .call(xaxis);

      // X軸のラベルを追加
      var xAxisTextAll = layer.selectAll('.x-axis-text').data(['dummy']);
      xAxisTextAll
        // ENTER領域
        .enter()
        .append('text')
        .classed('x-axis-text', true) // CSSファイル参照
        // ENTER + UPDATE領域
        .merge(xAxisTextAll)
        .attr('x', w - 8)
        .attr('y', h - 8)
        .text(xAxisText);

      // y軸を追加する。クラス名はCSSと合わせる
      var yAxisAll = layer.selectAll('.y-axis').data(['dummy']);
      yAxisAll
        // ENTER領域
        .enter()
        .append('g')
        .classed('y-axis', true)
        // ENTER + UPDATE領域
        .merge(yAxisAll)
        .call(yaxis);

      // Y軸のラベルを追加
      var yAxisTextAll = layer.selectAll('.y-axis-text').data(['dummy']);
      yAxisTextAll
        // ENTER領域
        .enter()
        .append('text')
        .classed('y-axis-text', true) // CSSファイル参照
        // ENTER + UPDATE領域
        .merge(yAxisTextAll)
        .attr('transform', 'rotate(-90)')
        .attr('x', -8)
        .attr('y', 8)
        .attr('dy', '.71em')
        .text(yAxisText);

      // X軸に対してグリッド線を引く(Y軸と平行の線)
      if (drawXGrid) {
        var xGridAll = layer.selectAll('.x-grid').data(['dummy']);
        xGridAll
          // ENTER領域
          .enter()
          .append('g')
          .classed('x-grid', true)
          .merge(xGridAll)
          .call(make_x_gridlines().tickSize(-h).tickFormat(''));
        //
      }

      // Y軸に対してグリッド線を引く(X軸と平行の線)
      if (drawYGrid) {
        var yGridAll = layer.selectAll('.y-grid').data(['dummy']);
        yGridAll
          // ENTER領域
          .enter()
          .append('g')
          .classed('y-grid', true)
          .merge(yGridAll)
          .call(make_y_gridlines().tickSize(-w).tickFormat(''));

        // グラフを表示
        var pathGAll = layer.selectAll('.pathG').data(['dummy']);
        var pathG = pathGAll
          // ENTER領域
          .enter()
          .append('g')
          .classed('pathG', true)
          .merge(pathGAll)
          .attr('width', w)
          .attr('height', h);

        var areaAll = pathG.selectAll('.' + CLASS_CHART_AREA).data(['dummy']);
        areaAll
          .enter()
          .append('path')
          .classed(CLASS_CHART_AREA, true)
          .merge(areaAll)
          .datum(tideDatas)
          .attr('d', area);

        var lineAll = pathG.selectAll('.' + CLASS_CHART_LINE).data(['dummy']);
        linePath = lineAll
          .enter()
          .append('path')
          .classed(CLASS_CHART_LINE, true)
          .merge(lineAll)
          .datum(tideDatas)
          .attr('d', line);
        //
      }
    }

    //
    // タイムラインをセットアップする
    //

    // 入力ドメイン i=0～1 として、出力レンジを実際の時刻に変換するスケールを作成する
    // 例えば、0を指定したときが7時、1を指定したときが14時、というようにする
    // 出力レンジは、データ入手後に設定する
    var iScale = d3.scaleLinear().domain([0, 1]);

    // さらに、その時刻をX座標に変換するスケールを作るのだが
    // この時点ではxScaleのドメインがまだ設定されていないので、
    // インスタンス変数だけ定義して後から設定する
    var tScale; // = function(i) { return xScale(iScale(i)); };

    // タイムライン用のパスジェネレータ
    var tline = d3.line()
      .x(function(d) {
        return d[0];
      })
      .y(function(d) {
        return d[1];
      });

    // タイムライン用のパスジェネレータで生成された縦線のパス
    var tpath;

    // タイムラインの交点に配置する'circle'のセレクタ
    var tcircle;

    // タイムラインを追加する
    function initTimeline() {
      // iScaleの出力レンジを実際のデータに合わせる
      iScale.range(timeDomain);

      // tScaleはi=0~1の入力に対してX座標に変換する
      tScale = function(i) {
        return xScale(iScale(i));
      };

      // 初期値
      var t = 0.0;
      var tx1 = tScale(t);
      var ty1 = 0;
      var tx2 = tScale(t);
      var ty2 = h;
      var tdata = [[tx1, ty1], [tx2, ty2]];

      var timelineAll = layer.selectAll('.' + CLASS_TIMELINE).data(['dummy']);
      tpath = timelineAll
        .enter()
        .append('path')
        .classed(CLASS_TIMELINE, true)
        .merge(timelineAll)
        .attr('d', tline(tdata));

      var tcircleAll = layer.selectAll('.' + CLASS_TCIRCLE).data(['dummy']);
      tcircle = tcircleAll
        .enter()
        .append('circle')
        .classed(CLASS_TCIRCLE, true)
        .merge(tcircleAll)
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', '6');

      // 0すなわち7時のところに線を引く。あとはこれを移動する。
      setTimeline(0);
    }

    // ソートされた配列に対して近傍値のインデックスを返してくれる関数
    var xbisector = d3.bisector(function(d) {
      return d[0];
    }).right;

    // i=0～1を引数にして、時刻に応じた場所に縦線を移動する
    function setTimeline(i) {
      // X座標はtScale関数を通せば分かる
      var x = tScale(i);

      // 縦線をひくためのデータはこれでよい
      var tdata = [[x, 0], [x, h]];

      // そのデータをパスジェネレータに渡して、パスを移動する
      tpath.attr('d', tline(tdata));

      // その２を使う
      var method = 2;

      // ラインとの交点を探る方法・その１
      // ラインのパスを先頭から徐々に移動してX座標がその場所になるまで探っていく方法
      // accuracyは小さい方が正確だけどループから抜けるのに時間がかかる。
      // ●の半径が6なので、その半分に収まればよいものとする
      if (method === 1) {
        var pathEl = linePath.node();
        var pathLength = pathEl.getTotalLength();
        var accuracy = 3;

        var j;
        var pos;
        for (j = x; j < pathLength; j += accuracy) {
          pos = pathEl.getPointAtLength(j);
          if (pos.x >= x) {
            break;
          }
        }

        tcircle.attr('cx', x).attr('cy', pos.y);
      }

      // ラインとの交点を探る方法・その２
      // 近傍のデータで補完する
      if (method === 2) {
        // 時刻
        var t = iScale(i);
        var index = xbisector(tideDatas, t);
        var startDatum = tideDatas[index - 1];
        var endDatum = tideDatas[index];
        var interpolate = d3.interpolateNumber(startDatum[1], endDatum[1]);
        var range = endDatum[0] - startDatum[0];
        var valueY = interpolate((t % range) / range);
        var y = yScale(valueY);

        tcircle.attr('cx', x).attr('cy', y);
      }

      //
    }

    // call()されたときに呼ばれる公開関数
    function exports(_selection) {
      container = _selection;
      _selection.each(function(_data) {
        if (!_data) {
          // データにnullを指定してcall()した場合は、既存の描画領域を削除して終了
          container.select('.' + CLASS_CHART_LAYER).remove();
          return;
        }

        // 受け取ったデータをバラす
        timeDomain = _data.timeDomain;
        tideDatas = _data.tideDatas;

        // 受け取った潮汐データで入力ドメインを設定
        setDomain(tideDatas);

        // 変更したスケールをパスジェネレータに適用する
        setScale();

        // svgの作成を必要とするなら、新たにsvgを作成して、それをコンテナにする
        if (needsvg) {
          var svgAll = container.selectAll('svg').data(['dummy']);
          container = svgAll
            .enter()
            .append('svg')
            .merge(svgAll)
            .attr('width', width)
            .attr('height', height);
        }

        // コンテナに直接描画するのは気がひけるので、レイヤを１枚追加する
        var layerAll = container.selectAll('.' + CLASS_CHART_LAYER).data(['dummy']);
        layer = layerAll
          // ENTER領域
          .enter()
          .append('g')
          .classed(CLASS_CHART_LAYER, true)
          // ENTER + UPDATE領域
          .merge(layerAll)
          .attr('width', width)
          .attr('height', height);

        // レイヤにチャートを配置する
        initChart();

        // タイムラインを追加する
        initTimeline();

        //
      });
    }

    exports.width = function(_) {
      if (!arguments.length) {
        return width;
      }
      width = _;
      w = width - margin.left - margin.right;

      // スケール関数を直す
      xScale.range([0, w]);

      // スケールを変更したので、パスジェネレータも直す
      setScale();

      return this;
    };

    exports.height = function(_) {
      if (!arguments.length) {
        return height;
      }
      height = _;
      h = height - margin.top - margin.bottom;
      yScale.range([h, 0]);

      // スケールを変更したので、パスジェネレータも直す
      setScale();

      return this;
    };

    exports.xAxisText = function(_) {
      if (!arguments.length) {
        return xAxisText;
      }
      xAxisText = _;
      return this;
    };

    exports.yAxisText = function(_) {
      if (!arguments.length) {
        return yAxisText;
      }
      yAxisText = _;
      return this;
    };

    exports.xdomain = function(_) {
      if (!arguments.length) {
        return xdomain;
      }
      xdomain = _;
      xScale.domain(xdomain);
      return this;
    };

    exports.ydomain = function(_) {
      if (!arguments.length) {
        return ydomain;
      }
      ydomain = _;
      yScale.domain(ydomain);
      return this;
    };

    exports.xticks = function(_) {
      if (!arguments.length) {
        return xticks;
      }
      xticks = _;
      xaxis.ticks(xticks);
      return this;
    };

    exports.yticks = function(_) {
      if (!arguments.length) {
        return yticks;
      }
      yticks = _;
      yaxis.ticks(yticks);
      return this;
    };

    exports.setTimeline = function(d) {
      setTimeline(d);
      return this;
    };

    return exports;
  };

  //
})();
