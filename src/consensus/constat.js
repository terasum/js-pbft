module.exports = {
  NORMAL: 0,
  UNPREPARE: 1,
  UNCOMMIT: 2,
  COMITTED: 3,
  status: function(stat){
    switch(stat){
      case (this.NORMAL):
        return "NORMAL";
      case (this.UNPREPARE):
        return "UNPREPARE";
      case (this.COMITTED):
        return "UNCOMMIT";
      case (this.COMITTED):
        return "COMITTED";
      default:
        return "UNKNOW";
    }
  },
}