/* global aburatsuboat */

// aburatsuboat.tidedata.js
// 潮位データはここから引用
// http://www.data.jma.go.jp/kaiyou/db/tide/suisan/index.php

(function() {
  aburatsuboat.tidedata = function module() {
    // 潮位のテキストデータ
    var text = ' 50 69 96124145156152136112 85 64 54 57 74 98124145155151134108 79 54 401610 2Z1 5151561713155999999999999991115 532329 3899999999999999';

    var tideDatas = [];
    var m;
    for (m = 0; m < 24; m++) {
      var str = text.substr(m * 3, 3);
      var num = parseInt(str, 10) || 0;
      tideDatas.push([m, num]);
    }

    // tideDatas配列は、[時刻, 潮位]の配列の配列。
    // var tideDatas = [
    //   [0, 107],
    //   [1, 102],
    //   [2, 96],
    //   [3, 92],
    //   [4, 92],
    //   [5, 94],
    //   [6, 99],
    //   [7, 104],
    //   [8, 107],
    //   [9, 108],
    //   [10, 104],
    //   [11, 97],
    //   [12, 86],
    //   [13, 73],
    //   [14, 60],
    //   [15, 51],
    //   [16, 46],
    //   [17, 47],
    //   [18, 53],
    //   [19, 65],
    //   [20, 78],
    //   [21, 91],
    //   [22, 102],
    //   [23, 108]
    // ];

    // 外部公開する関数
    return {
      datas: tideDatas,
      range: [7, 14]
    };
  };
  //
})();
