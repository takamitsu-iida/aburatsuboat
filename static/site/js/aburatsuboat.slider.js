/* global d3, aburatsuboat */

// 2016.11.09
// Takamitsu IIDA

// d3iida.slider.jsから、名前空間を変更して利用

(function() {
  //
  aburatsuboat.slider = function module(_accessor) {
    //
    // クラス名定義
    // CSSファイルも見ること
    //

    // ボタンを配置するコンテナ
    var CLASS_BUTTON_CONTAINER = 'sl-button-container';

    // スライダを配置するコンテナ
    var CLASS_SLIDER_CONTAINER = 'sl-slider-container';

    // マウスイベントを仕込む背景
    var CLASS_TRACK_BACKGROUND = 'sl-slider-track-background';

    // 境界
    var CLASS_TRACK_OUTLINE = 'sl-slider-track-outline';

    // 内側の塗りつぶし
    var CLASS_TRACK_INSET = 'sl-slider-track-inset';

    // startとendの表示
    var CLASS_SLIDER_TICKS = 'sl-slider-ticks';

    // 丸
    var CLASS_SLIDER_HANDLE = 'sl-slider-handle';

    // ボタン設置場所へのマージン
    var buttonMargin = {
      top: 40,
      left: 50
    };

    // ボタンモジュールをインスタンス化する
    var ssbutton = aburatsuboat.ssbutton();

    // ボタンがクリックされたときのハンドラ
    ssbutton.on('click', function() {
      pause();
    });

    // スライダ設置場所へのマージン
    var sliderMargin = {
      top: 35,
      left: 110
    };

    // スライダの幅
    var sliderWidth = 400;

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
    var slider;

    // ハンドルの'circle'を選択するセレクタ
    var handle;

    // カスタムイベント 'hue'
    var dispatch = d3.dispatch('hue');

    // スライダの現在位置
    var hueActual = minValue;

    // スライダの目標値
    var hueTarget = minValue;

    // スムーズに移動させるパラメータとタイマー
    var hueAlpha = 0.2;
    var hueTimer = d3.timer(hueTween);

    // targetに滑らかにスライドする
    function hue(target) {
      hueTarget = target;
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

      // イベントで変更を通知
      // console.log(hueActual);
      // dispatch.call('hue', this, hueActual);
      callEvent('hue', this, hueActual);
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

        // ボタンの表示を変える
        ssbutton.text('開始');
      })
      .on('start drag', function() {
        hue(xScale.invert(d3.event.x));
      });

    // このモジュールをcall()したセレクション
    var container;

    // 公開関数
    function exports(_selection) {
      container = _selection;

      // ボタンを配置するコンテナ 'g' を作ってcall()する
      var ssbuttonContainerAll = container.selectAll('.' + CLASS_BUTTON_CONTAINER).data(['dummy']);
      ssbuttonContainerAll
        .enter()
        .append('g')
        .classed(CLASS_BUTTON_CONTAINER, true)
        // ENTER + UPDATE領域
        .merge(ssbuttonContainerAll)
        .attr('transform', 'translate(' + buttonMargin.left + ',' + buttonMargin.top + ')')
        .call(ssbutton);

      // スライダを配置するコンテナ 'g' を作って'sliderContainer'クラスを付与する
      var sliderContainerAll = container.selectAll('.' + CLASS_SLIDER_CONTAINER).data(['dummy']);
      slider = sliderContainerAll
        // ENTER領域
        .enter()
        .append('g')
        .classed(CLASS_SLIDER_CONTAINER, true)
        .merge(sliderContainerAll)
        // ENTER + UPDATE領域
        .attr('transform', 'translate(' + sliderMargin.left + ',' + sliderMargin.top + ')');

      // スライダのコンテナに対して、下に置くものから順に積み上げていく

      // 一番下は太さ50pxの極太ライン(rectでもいいけど、ラインの方が指定するポイントが少なくてすむ)
      // ドラッグイベントを処理する
      var sliderTrackBackgroundAll = slider.selectAll('.' + CLASS_TRACK_BACKGROUND).data(['dummy']);
      sliderTrackBackgroundAll
        .enter()
        .append('line')
        .classed(CLASS_TRACK_BACKGROUND, true)
        .merge(sliderTrackBackgroundAll)
        .attr('x1', xScale.range()[0])
        .attr('x2', xScale.range()[1])

        // ドラッグイベント
        .call(drag);

      // 次に置くのは輪郭になる太さ10pxのライン
      var sliderTrackOutlineAll = slider.selectAll('.' + CLASS_TRACK_OUTLINE).data(['dummy']);
      sliderTrackOutlineAll
        .enter()
        .append('line')
        .classed(CLASS_TRACK_OUTLINE, true)
        .merge(sliderTrackOutlineAll)
        .attr('x1', xScale.range()[0])
        .attr('x2', xScale.range()[1]);

      // 次に置くのは内側を塗りつぶす太さ8pxのライン
      var sliderTrackInsetAll = slider.selectAll('.' + CLASS_TRACK_INSET).data(['dummy']);
      sliderTrackInsetAll
        .enter()
        .append('line')
        .classed(CLASS_TRACK_INSET, true)
        .merge(sliderTrackInsetAll)
        .attr('x1', xScale.range()[0])
        .attr('x2', xScale.range()[1]);

      // 目盛を表示する領域'g'を追加
      // スライダよりも18pxだけ下に下げる
      var ticksAll = slider.selectAll('.' + CLASS_SLIDER_TICKS).data(['dummy']);
      ticksAll
        // ENTER領域
        .enter()
        .append('g')
        .classed(CLASS_SLIDER_TICKS, true)
        // ENTER + UPDATE領域
        .merge(ticksAll)
        .attr('transform', 'translate(0,' + 18 + ')');

      // 目盛になるテキスト
      var ticksTextAll = container.select('.' + CLASS_SLIDER_TICKS).selectAll('text').data(xScale.ticks(1));
      ticksTextAll
        // ENTER領域
        .enter()
        .append('text')
        // ENTER + UPDATE領域
        .merge(ticksTextAll)
        .attr('x', xScale)
        .attr('text-anchor', 'middle')
        .text(function(d) {
          // xTicks[0]は'start'、xTicks[1]は'end'
          return xTicks[d] || '';
        });

      ticksTextAll
        // EXIT領域
        .exit()
        .remove();

      // ハンドルを追加する
      var handleAll = slider.selectAll('.' + CLASS_SLIDER_HANDLE).data(['dummy']);
      handle = handleAll
        .enter()
        .append('circle')
        .classed(CLASS_SLIDER_HANDLE, true)
        .merge(handleAll)
        .attr('r', 9)
        .attr('cx', xScale(minValue));

      //
    }

    // 頻繁に'hue'イベントを発火させると重たいのでdebounce処理を加える
    var debounceTimer;
    var debounceInterval = 30;
    function callEvent(eventname, context, data) {
      // 最後に呼ばれた時の値を使うために、この関数のインスタンスに保存しておく
      this.eventname = eventname;
      this.context = context;
      this.data = data;
      debounceTimer = debounceTimer || window.setTimeout(function() {
        debounceTimer = null;
        // イベントを発行する
        dispatch.call(this.eventname, this.context, this.data);
      }, debounceInterval);
    }

    function pause() {
      // スライダーに仕込んでいるトランジションが動いているなら、それを停止して、処理完了
      if (slider.node().__transition) {
        // スライダのトランジションを停止
        slider.interrupt();

        // ボタンの表示を'開始'に戻す
        ssbutton.text('開始');
        return;
      }

      // ボタンの表示を'停止'にする
      ssbutton.text('停止');

      // 一番右まで行っているなら最初に巻き戻す
      if (hueActual === maxValue) {
        hueActual = minValue;
        handle.attr('cx', xScale(minValue));
      }

      // 現在位置から計算して、残り時間がどのくらいかを計算してトランジションを作成する
      hueTarget = maxValue;
      var t = d3.transition()
        .duration((hueTarget - hueActual) / (maxValue - minValue) * duration)
        .ease(d3.easeLinear);

      // トランジションをかけて移動する
      slider
        .transition(t)
        .tween('hue', function() {
          var i = d3.interpolate(hueActual, maxValue);
          return function(d) {
            hueActual = i(d);
            if (hueActual === maxValue) {
              // console.log('最大値に到達しました');
              ssbutton.text('開始');
            }
            handle.attr('cx', xScale(hueActual));
            // dispatch.call('hue', this, hueActual);
            callEvent('hue', this, hueActual);
          };
        });

      //
    }

    //
    // クロージャ
    //

    exports.sliderWidth = function(_) {
      if (!arguments.length) {
        return sliderWidth;
      }
      sliderWidth = _;
      xScale.range([0, sliderWidth]);
      return this;
    };

    exports.minValue = function(_) {
      if (!arguments.length) {
        return minValue;
      }
      minValue = _;
      xScale.domain([minValue, maxValue]);
      return this;
    };

    exports.maxValue = function(_) {
      if (!arguments.length) {
        return maxValue;
      }
      maxValue = _;
      xScale.domain([minValue, maxValue]);
      return this;
    };

    exports.duration = function(_) {
      if (!arguments.length) {
        return duration;
      }
      duration = _;
      return this;
    };

    exports.debounceInterval = function(_) {
      if (!arguments.length) {
        return debounceInterval;
      }
      debounceInterval = _;
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
    var CLASS_BUTTON_RECT = 'sl-ssbutton';
    var CLASS_BUTTON_TEXT = 'sl-ssbutton-text';

    // 表示テキスト
    var text = '開始';

    // テキストと外枠の'rect'までのスペース
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
      var ssbuttonTextAll = container.selectAll('.' + CLASS_BUTTON_TEXT).data(['dummy']);
      var ssbuttonText = ssbuttonTextAll
        .enter()
        .append('text')
        .classed(CLASS_BUTTON_TEXT, true)
        .merge(ssbuttonTextAll)
        .text(text);

      // テキストの境界ボックスを取り出す
      var bbox = ssbuttonText.node().getBBox();

      // ボタンとなる'rectをテキストの前に挿入する
      var ssbuttonAll = container.selectAll('.' + CLASS_BUTTON_RECT).data(['dummy']);
      ssbuttonAll
        .enter()
        .insert('rect', '.' + CLASS_BUTTON_TEXT)
        .classed(CLASS_BUTTON_RECT, true)
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
      if (container) {
        container.select('.' + CLASS_BUTTON_TEXT).text(text);
      }
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
