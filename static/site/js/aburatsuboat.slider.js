/* global d3, aburatsuboat */

// Smooth Slider
// by Mike Bostock
// https://bl.ocks.org/mbostock/6499018

// 上記を参考にして作ったスライダモジュール
(function() {
  //
  this.aburatsuboat = this.aburatsuboat || {};

  aburatsuboat.slider = function module(_accessor) {
    // 外側の枠の大きさ
    var width = 800;
    var height = 100;

    // 'g'の描画領域となるデフォルトのマージン
    var margin = {
      top: 10,
      right: 100,
      bottom: 10,
      left: 150
    };

    // マージンの分だけ小さくしておく。
    var w = width - margin.left - margin.right;
    var h = height - margin.top - margin.bottom;

    // 最小値、最大値
    // 0～1の数字で扱うように正規化したほうが楽
    var minValue = 0;
    var maxValue = 1;

    // どのくらいの時間をかけて移動するか(10秒)
    var duration = 10000;

    // スケール関数
    var xScale = d3.scaleLinear()
      .domain([minValue, maxValue])
      .range([0, w])
      .clamp(true);

    // スライダの'g'を選択するセレクタ
    var slider = d3.select(null);

    // ハンドル
    var handle = d3.select(null);

    // カスタムイベントを登録する
    var dispatch = d3.dispatch('hue');

    var hueActual = minValue;
    var hueTarget = minValue;
    var hueAlpha = 0.2;
    var hueTimer = d3.timer(hueTween);

    function hue(h) {
      hueTarget = h;
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
        console.log('start.interrupt');
        slider.interrupt();
      })
      .on('start drag', function() {
        console.log(xScale.invert(d3.event.x));
        hue(xScale.invert(d3.event.x));
      });

    // call()したセレクション
    var container;

    // call()したときに呼ばれる公開関数
    function exports(_selection) {
      container = _selection;

      // 全体枠
      var sliderLayerAll = container.selectAll('.sliderLayer').data(['dummy']);
      sliderLayerAll
        .enter()
        .append('g')
        .classed('sliderLayer', true)
        .merge(sliderLayerAll)
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      // 上下の中心位置にくるように新しい'g'を作り、'slider'クラスを付与する
      var sliderAll = container.select('.sliderLayer').selectAll('.slider').data(['dummy']);

      // ENTER領域に作成した'g'には、後ほどハンドルをinsertするので、変数に保存しておく
      var sliderEnter = sliderAll
        // ENTER領域
        .enter()
        .append('g')
        .classed('slider', true)
        .attr('transform', 'translate(0,' + h / 2 + ')');

      sliderAll
        // UPDATE領域
        .attr('transform', 'translate(0,' + h / 2 + ')');

      // スライダを選択するセレクタ
      // exports関数の外側でこれを利用する
      slider = container.select('.slider');

      // その'slider'クラスの'g'にlineを追加し、'slider-track'クラスを付与する
      var trackAll = slider.selectAll('.slider-track').data(['dummy']);
      trackAll
        // ENTER領域
        .enter()
        // ラインを'track'クラスで作成する
        // 10pxの太さをもち、この上に8pxのラインを重ねるので、輪郭だけが残ることになる
        .append('line')
        .classed('slider-track', true)
        .attr('x1', xScale.range()[0])
        .attr('x2', xScale.range()[1])
        .select(function() {
          // 同じラインを複製して、'slider-track-inset'クラスを付与する
          // 太さ8pxで、一番内側になる
          return this.parentNode.appendChild(this.cloneNode(true));
        })
        .classed('slider-track-inset', true)
        .select(function() {
          // さらにもうひとつ同じラインを複製して、'slider-track-overlay'クラスを付与する
          // 太さ50pxで、これがドラッグ処理の土台になる
          return this.parentNode.appendChild(this.cloneNode(true));
        })
        .classed('slider-track-overlay', true)
        .call(drag);

      trackAll
        // UPDATE領域
        .attr('x1', xScale.range()[0])
        .attr('x2', xScale.range()[1]);

      var ticksAll = slider.selectAll('.slider-ticks').data(['dummy']);
      ticksAll
        // ENTER領域
        .enter()
        .append('g')
        .classed('slider-ticks', true)
        .merge(ticksAll)
        // ENTER + UPDATE領域
        .attr('transform', 'translate(0,' + 18 + ')');

      var ticksTextAll = container.select('.slider-ticks').selectAll('text').data(xScale.ticks(1));
      ticksTextAll
        // ENTER領域
        .enter()
        .append('text')
        .merge(ticksTextAll)
        // ENTER + UPDATE領域
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
      // これが一番上に来てしまうとイベント処理されないので'slider-track-overlay'よりも前に挿入する
      sliderEnter
        .insert('circle', '.slider-track-overlay')
        .classed('slider-handle', true)
        .attr('r', 9)
        .attr('cx', xScale(minValue));

      // ハンドルを選択するセレクタ
      handle = container.select('.slider-handle');

      paused();
      //
    }

    function paused() {
      if (hueActual === maxValue) {
        // 一番右まで行っているなら最初から
        console.log('先頭に戻します');
        hueActual = minValue;
        handle.attr('cx', xScale(minValue));
      }

      hueTarget = maxValue;
      var t = d3.transition().duration((hueTarget - hueActual) / (hueTarget - minValue) * duration).ease(d3.easeLinear);
      slider
        .transition(t)
        .tween('hue', function() {
          var i = d3.interpolate(minValue, maxValue);
          return function(d) {
            handle.attr('cx', xScale(i(d)));
          };
        });

      // this.textContent = '停止';
    }

    //
    // クロージャ
    //

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
})();
