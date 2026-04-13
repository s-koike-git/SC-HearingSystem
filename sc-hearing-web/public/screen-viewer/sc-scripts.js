
/*/レイヤーの表示・非表示/*/
/*/V70 sub2～sub5追加 2011/07/21okimoto/*/
  function showhide(id){

	if (id == "main"){
		document.getElementById('main').style.display = "block";
		document.getElementById('sub').style.display = "none";
		document.getElementById('sub2').style.display = "none";
		document.getElementById('sub3').style.display = "none";
		document.getElementById('sub4').style.display = "none";
		document.getElementById('sub5').style.display = "none";
	}else if (id == "sub"){
		document.getElementById('main').style.display = "none";
		document.getElementById('sub').style.display = "block";
		document.getElementById('sub2').style.display = "none";
		document.getElementById('sub3').style.display = "none";
		document.getElementById('sub4').style.display = "none";
		document.getElementById('sub5').style.display = "none";
	}else if (id == "sub2"){
		document.getElementById('main').style.display = "none";
		document.getElementById('sub').style.display = "none";
		document.getElementById('sub2').style.display = "block";
		document.getElementById('sub3').style.display = "none";
		document.getElementById('sub4').style.display = "none";
		document.getElementById('sub5').style.display = "none";
	}else if (id == "sub3"){
		document.getElementById('main').style.display = "none";
		document.getElementById('sub').style.display = "none";
		document.getElementById('sub2').style.display = "none";
		document.getElementById('sub3').style.display = "block";
		document.getElementById('sub4').style.display = "none";
		document.getElementById('sub5').style.display = "none";
	}else if (id == "sub4"){
		document.getElementById('main').style.display = "none";
		document.getElementById('sub').style.display = "none";
		document.getElementById('sub2').style.display = "none";
		document.getElementById('sub3').style.display = "none";
		document.getElementById('sub4').style.display = "block";
		document.getElementById('sub5').style.display = "none";
	}else if (id == "sub5"){
		document.getElementById('main').style.display = "none";
		document.getElementById('sub').style.display = "none";
		document.getElementById('sub2').style.display = "none";
		document.getElementById('sub3').style.display = "none";
		document.getElementById('sub4').style.display = "none";
		document.getElementById('sub5').style.display = "block";
	}else{

    if(document.getElementById){
      if(document.getElementById(id).style.display == "block")
        document.getElementById(id).style.display = "none";
      else
        document.getElementById(id).style.display = "block";
    }
	}

  }

/*/タイトルメニューのスクロール追従/*/
function scrollmenu(){
    x = 0; //左からの表示位置
    y = 0; //上からの表示位置
    sx = document.body.scrollLeft;
    sy = document.body.scrollTop;
    document.all.menu.style.left = sx + x;
    document.all.menu.style.top = sy + y;
}


/*/IE用レイアウト補正/*/
function removeIEOutline(){
var a,input;
if(!((a=(this.a=document.all&&document.all.tags)&&
     (this.input=this.a('input'))&&
     (this.a=this.a('a'))&&this.a.length)|
     (input=this.input&&this.input.length ))
  )return;
while(a)this.a[--a].onfocus=new Function("this.blur();");
while(input)this.input[--input].onfocus=new Function("this.blur();");
}


/*/ 複数レイヤー スライド用関数 
========================================================
slideLAYERs('レイヤ－名',スタ－ト位置X,Y,終了位置X,Y,スピ－ド,ステップ数) 
 使用例  
 slideLAYERs('tabaco',10,10,200,-250,10,20)
=======================================================*/

var wx=new Array(),wy=new Array(),count=new Array()
var ex=new Array(),ey=new Array(),spd=new Array()
var step=new Array(),stepX=new Array(),stepY=new Array()
var mvFlag=new Array(),slideID=new Array()
var flag=0
function 
  slideLAYERs(layName,startX,startY,endX,endY,speed,stpx){
    if(flag!=0){
		endX=startX
    	startX=endX
	}
    //--移動初期化
    if(!mvFlag[layName]){
     if(document.layers)clearTimeout(slideID[layName])
      count[layName]=0        //--移動回数カウント
      var ofX=(endX-startX)   //--移動距離x
      var ofY=(endY-startY)   //--移動距離y
      step[layName]=stpx      //--ステップ数
      stepX[layName]=ofX/stpx //--移動量x
      stepY[layName]=ofY/stpx //--移動量y
      wx[layName]=startX      //--移動中のx座標
      wy[layName]=startY      //--移動中のy座標
      ex[layName]=endX        //--到着場所のx座標
      ey[layName]=endY        //--到着場所のy座標
      spd[layName]=speed      //--移動スピ－ド(間隔)
      mvFlag[layName]=true    //--移動中ならtrue
    }
    if(mvFlag[layName]&&(count[layName]<=step[layName]-1)){
      count[layName]++
      wx[layName]+=stepX[layName]
      wy[layName]+=stepY[layName]
      if(document.getElementById){ //--移動
        document.getElementById(layName).style.left=wx[layName]
        document.getElementById(layName).style.top=wy[layName]
      } else if(document.layers) {
        document.layers[layName].moveTo(wx[layName],wy[layName])
      } else if(document.all){
        document.all(layName).style.pixelLeft=wx[layName]
        document.all(layName).style.pixelTop=wy[layName]
      }
      if(document.layers)clearTimeout(slideID[layName])
      slideID[layName]=setTimeout('slideLAYERs("'+layName+'")',spd[layName])
    }else{ //--停止
      wx[layName]=ex[layName]
      wy[layName]=ey[layName]
      clearTimeout(slideID[layName]);mvFlag[layName]=false
		
	  if(flag==0){
	    flag=1
    	}else{
        flag=0
	  }
    }

}
