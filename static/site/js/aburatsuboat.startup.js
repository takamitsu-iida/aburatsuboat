/* global d3, topojson, aburatsuboat */

// グローバルに独自の名前空間を定義する
(function() {
  // このthisはグローバル空間
  this.aburatsuboat = this.aburatsuboat || (function() {
    // アプリのデータを取り込む場合、appdata配下にぶら下げる
    var appdata = {};

    // ヒアドキュメント経由で静的データを取り込む場合、テキストデータをheredoc配下にぶら下げる
    var heredoc = {};

    // 地図データを取り込む場合、geodata配下にぶら下げる
    var geodata = {};

    // 公開するオブジェクト
    return {
      appdata: appdata,
      heredoc: heredoc,
      geodata: geodata
    };
  })();
  //
})();

// メイン関数
(function() {
  aburatsuboat.main = function() {
    var container = d3.select('#aburatsuboat');

    // 潮汐データを取り出す
    // aburatsuboat.tidedata.js
    var timeDomain = aburatsuboat.appdata.timeDomain;
    var tideDatas = aburatsuboat.appdata.tideDatas;

    // ボートの軌跡データを取り出す
    // aburatsuboat.boatdata.js
    var geodataBoat = aburatsuboat.appdata.boatTopojson;

    // 取り出したいデータの変数名はobjects.aburatsubo_20150110のようにファイルごとに変わってしまう
    // 最初の値であることが分かっているので、先頭のキーを取り出して、それに対応する値を取り出す
    var key = Object.keys(geodataBoat.objects)[0];
    var featuresBoat = topojson.feature(geodataBoat, geodataBoat.objects[key]).features;

    // データを一つにパッキングしておく
    var data = {
      timeDomain: timeDomain,
      tideDatas: tideDatas,
      featuresBoat: featuresBoat
    };

    // mapChartをインスタンス化する
    var chart = aburatsuboat.mapChart();

    // コンテナにデータを紐付けてcall()する
    container.datum(data).call(chart);
  };
  //
})();
