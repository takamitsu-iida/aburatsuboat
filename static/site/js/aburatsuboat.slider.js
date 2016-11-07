/* global d3, aburatsuboat */

// Smooth Slider
// by Mike Bostock
// https://bl.ocks.org/mbostock/6499018

// 上記を参考にして作成したスライダモジュール
// スタイル指定をしているのでCSSファイル必須
(function() {
  //
  this.aburatsuboat = this.aburatsuboat || {};

  aburatsuboat.slider = function module(_accessor) {
    // 外側の枠の大きさ
    var width = 600;
    var height = 100;

    // ボタン設置場所へのマージン
    var buttonMargin = {
      top: 40,
      left: 50
    };

    // スライダ設置場所へのマージン
    var sliderMargin = {
      top: 35,
      left: 110,
      right: 50
    };

    // スライダの幅は、外側の枠の大きさから、左と右のマージンを差し引いた分になる
    var sliderWidth = width - sliderMargin.left - sliderMargin.right;

    // 最小値、最大値
    // 0～1の数字で扱うように正規化したほうが楽
    var minValue = 0;
    var maxValue = 1;

    // どのくらいの時間をかけて移動するか(10秒)
    var duration = 10000;

    // スケール関数
    var xScale = d3.scaleLinear()
      .domain([minValue, maxValue])
      .range([0, sliderWidth])
      .clamp(true);

    // スライダの'g'を選択するセレクタ
    var slider = d3.select(null);

    // ハンドル
    var handle = d3.select(null);

    // カスタムイベント 'hue'
    var dispatch = d3.dispatch('hue');

    var hueActual = minValue;
    var hueTarget = minValue;
    var hueAlpha = 0.2;
    var hueTimer = d3.timer(hueTween);

    // tに滑らかにスライドする
    function hue(t) {
      hueTarget = t;
      hueTimer.restart(hueTween);
    }

    function hueTween() {
      var hueError = hueTarget - hueActual;
      if (Math.abs(hueError) < 1e-3) {
        hueActual = hueTarget;
        hueTimer.stop();
      } else {
        hueActual += hueError * hueAlpha;
      }
      handle.attr('cx', xScale(hueActual));
      dispatch.call('hue', this, hueActual);
      // console.log(hueActual);
    }

    var xTicks = {
      0: 'start',
      1: 'end'
    };

    // ドラッグ設定
    var drag = d3.drag()
      .on('start.interrupt', function() {
        // 動いているスライダは停止する
        slider.interrupt();
      })
      .on('start drag', function() {
        hue(xScale.invert(d3.event.x));
      });

    var ssbutton = aburatsuboat.ssbutton();

    ssbutton.on('click', function() {
      console.log('button clicked');
      paused();
    });

    // このモジュールをcall()したセレクション
    var container;

    // 公開関数
    function exports(_selection) {
      container = _selection;

      // ボタンを配置するコンテナ 'g' を作ってcall()する
      var ssbuttonContainerAll = container.selectAll('.ssbuttonContainer').data(['dummy']);
      ssbuttonContainerAll
        .enter()
        .append('g')
        .classed('ssbuttonContainer', true)
        // ENTER + UPDATE領域
        .merge(ssbuttonContainerAll)
        .attr('transform', 'translate(' + buttonMargin.left + ',' + buttonMargin.top + ')')
        .call(ssbutton);

      // スライダを配置するコンテナ 'g' を作って'sliderContainer'クラスを付与する
      var sliderContainerAll = container.selectAll('.sliderContainer').data(['dummy']);
      slider = sliderContainerAll
        // ENTER領域
        .enter()
        .append('g')
        .classed('sliderContainer', true)
        .merge(sliderContainerAll)
        // ENTER + UPDATE領域
        .attr('transform', 'translate(' + sliderMargin.left + ',' + sliderMargin.top + ')');

      // 下に置くものから順に積み上げていく

      // 一番下は太さ50pxの極太ライン(rectでもいいけど、ラインの方が指定するポイントが少なくてすむ)
      // ドラッグイベントを処理する
      var sliderTrackBackgroundAll = slider.selectAll('.slider-track-background').data(['dummy']);
      sliderTrackBackgroundAll
        .enter()
        .append('line')
        .classed('slider-track-background', true)
        .merge(sliderTrackBackgroundAll)
        .attr('x1', xScale.range()[0])
        .attr('x2', xScale.range()[1])
        // ドラッグイベント
        .call(drag);

      // 次に置くのは輪郭になる太さ10pxのライン
      var sliderTrackOutlineAll = slider.selectAll('.slider-track-outline').data(['dummy']);
      sliderTrackOutlineAll
        .enter()
        .append('line')
        .classed('slider-track-outline', true)
        .merge(sliderTrackOutlineAll)
        .attr('x1', xScale.range()[0])
        .attr('x2', xScale.range()[1]);

      // 次に置くのは内側を塗りつぶす太さ8pxのライン
      var sliderTrackInsetAll = slider.selectAll('.slider-track-inset').data(['dummy']);
      sliderTrackInsetAll
        .enter()
        .append('line')
        .classed('slider-track-inset', true)
        .merge(sliderTrackInsetAll)
        .attr('x1', xScale.range()[0])
        .attr('x2', xScale.range()[1]);

      // 目盛を表示する領域'g'を追加
      // スライダよりも18pxだけ下に下げる
      var ticksAll = slider.selectAll('.slider-ticks').data(['dummy']);
      ticksAll
        // ENTER領域
        .enter()
        .append('g')
        .classed('slider-ticks', true)
        // ENTER + UPDATE領域
        .merge(ticksAll)
        .attr('transform', 'translate(0,' + 18 + ')');

      // 目盛になるテキスト
      var ticksTextAll = container.select('.slider-ticks').selectAll('text').data(xScale.ticks(1));
      ticksTextAll
        // ENTER領域
        .enter()
        .append('text')
        // ENTER + UPDATE領域
        .merge(ticksTextAll)
        .attr('x', xScale)
        .attr('text-anchor', 'middle')
        .text(function(d) {
          return xTicks[d] || '';
        });

      ticksTextAll
        // EXIT領域
        .exit()
        .remove();

      // ハンドルを追加する
      var handleAll = slider.selectAll('.slider-handle').data(['dummy']);
      handle = handleAll
        .enter()
        .append('circle')
        .classed('slider-handle', true)
        .attr('r', 9)
        .attr('cx', xScale(minValue))
        .merge(handleAll);

      //
    }

    function paused() {
      // スライダーに仕込んでいるトランジションが動いているなら、それを止める
      if (slider.node().__transition) {
        console.log('動いているので停止します');
        slider.interrupt();
        // ボタンの表示を変える
        // this.textContent = "開始";
      } else {
        // スライダーが停止しているなら、その場所から再開する
        if (hueActual === maxValue) {
          // 一番右まで行っているなら最初に巻き戻す
          console.log('先頭に戻します');
          hueActual = minValue;
          handle.attr('cx', xScale(minValue));
        }

        // 残り時間がどのくらいかを計算する
        hueTarget = maxValue;
        var t = d3.transition().duration((hueTarget - hueActual) / (hueTarget - minValue) * duration).ease(d3.easeLinear);

        // トランジションをかけて移動する
        slider
          .transition(t)
          .tween('hue', function() {
            var i = d3.interpolate(hueActual, maxValue);
            return function(d) {
              hueActual = i(d);
              if (hueActual === maxValue) {
                console.log('最大値に到達しました');
              }
              handle.attr('cx', xScale(hueActual));
              dispatch.call('hue', this, hueActual);
            };
          });

        //
      }

      // this.textContent = '停止';
    }

    //
    // クロージャ
    //

    exports.width = function(_) {
      if (!arguments.length) {
        return width;
      }
      width = _;
      sliderWidth = width - sliderMargin.left - sliderMargin.right;
      xScale.range([0, sliderWidth]);
      return this;
    };

    exports.height = function(_) {
      if (!arguments.length) {
        return height;
      }
      height = _;
      return this;
    };

    exports.minValue = function(_) {
      if (!arguments.length) {
        return minValue;
      }
      minValue = _;
      return this;
    };

    exports.maxValue = function(_) {
      if (!arguments.length) {
        return maxValue;
      }
      maxValue = _;
      return this;
    };

    exports.on = function() {
      var value = dispatch.on.apply(dispatch, arguments);
      return value === dispatch ? exports : value;
    };

    return exports;
  };

  //
  //
  //

  // svgの簡易ボタンモジュール
  aburatsuboat.ssbutton = function module(_accessor) {
    // 表示テキスト
    var text = '開始';

    // 文字と'rect'までの距離
    var padding = 10;

    // rectの角を曲げるときの半径
    var radius = 3;

    // カスタムイベントを登録する
    var dispatch = d3.dispatch('click');

    // このモジュールをcall()したセレクション
    var container;

    // 公開関数
    function exports(_selection) {
      container = _selection;

      // コンテナにテキストをのせる
      var ssbuttonTextAll = container.selectAll('.ssbuttonText').data(['dummy']);
      var ssbuttonText = ssbuttonTextAll
        .enter()
        .append('text')
        .classed('ssbuttonText', true)
        .merge(ssbuttonTextAll)
        .text(text);

      // テキストの境界ボックスを取り出す
      var bbox = ssbuttonText.node().getBBox();

      // ボタンとなる'rectをテキストの前に挿入する
      var ssbuttonAll = container.selectAll('.ssbutton').data(['dummy']);
      ssbuttonAll
        .enter()
        .insert('rect', '.ssbuttonText')
        .classed('ssbutton', true)
        .on('click', function(d) {
          dispatch.call('click', this, d);
        })
        .merge(ssbuttonAll)
        .attr('x', bbox.x - padding)
        .attr('y', bbox.y - padding)
        .attr('width', bbox.width + 2 * padding)
        .attr('height', bbox.height + 2 * padding)
        .attr('rx', radius)
        .attr('ry, radius');

      //
    }

    exports.text = function(_) {
      if (!arguments.length) {
        return text;
      }
      text = _;
      return this;
    };

    exports.on = function() {
      var value = dispatch.on.apply(dispatch, arguments);
      return value === dispatch ? exports : value;
    };

    return exports;
    //
  };

  //
})();
