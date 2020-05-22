import React from 'react';
import MVP from '../../utils/mvp';
// import styled from 'styled-components';
import Map from './map';
import DeviceOrientation, { Orientation } from '../../utils/react-orientation';
import api from '../../api';
import './style.css';
import SweetAlert from 'sweetalert-react';
import { withRouter } from 'react-router-dom';
import { withCookies } from 'react-cookie';
import Cookie from '../../cookie';
import Socket from '../../socket';
import {connect} from 'react-redux';
import moment from 'moment';
import 'moment/locale/zh-hk';

const toGoogleUrl = ( start, end ) => 
    `https://www.google.com/maps?saddr=${start.lat},${start.lng}&daddr=${end.lat},${end.lng}`;


class View extends MVP.View{

    constructor(props){
        super(props);
        this.state = { 
            order: null,
            myLoc: null,
            alert: {
                show: false,
                title: "",
                text: "",
                type: "text",
                placeholder: "",
                onConfirm: input => {
                    console.log('Hello');
                }
            },
            modal: null,
            confirmed: false,
            cancel: false,
        }
    }

    getMe = async() => {
        const accessToken = this.props.accessToken;
        const userId = this.props.user._id;
        const user = await api.user.getMe(userId, accessToken);
        this.setState({ me: user });
    }

    async componentWillMount(){
        if ( this.props.user == null )
            return this.props.history.replace('/');

        const { cookies } = this.props;
        this.cookie = new Cookie(cookies.getAll());
        await this.getMe();

        Socket.listen(async event => {
            console.log(event);

            switch(event){
                case 'USER_CANCEL':
                    await window.alert('乘客已取消訂單');
                    await this.props.history.replace('/main');
                    // setTimeout(async() => {
                    //     this.props.history.replace('/main');
                    // }, 1000);
                    // this.setState({cancel: true});
                    break;
                // case 'ORDER_OVERTIME_CONFIRM':
                    // this.presenter.confirmOvertime();
            }
        });
    }

    async componentDidMount(){

        const _this = this;

        const order = await api.order.getAnOrder(this.props.match.params.orderId);
        this.setState({ order: order,confirmed: order.status != "accepted" });
        // console.log("===========orderpage========");
        // console.log(this.state);

        if ( navigator.geolocation )
            navigator.geolocation.getCurrentPosition(function(position){
                console.log(position)
                const { latitude, longitude } = position.coords;
                _this.setState({ myLoc: { lat: latitude, lng: longitude }});
            })
        else
            console.log('no navigator')

    }

    alert = ( title, text, onConfirm ) => {
        const state = JSON.parse(JSON.stringify(this.state));
        state.alert.title = title;
        state.alert.text = text;
        state.alert.show = true;
        state.alert.type = 'text';
        state.alert.onConfirm = onConfirm;
        this.setState( state );
    }

    renderPortrait = props => {

        moment.locale('zh-hk');
        // console.log(this.props)
        // console.log(this.props.user._id == this.state.order.orderBy._id )

        return (
            <React.Fragment>
                <Map 
                    height="50%"
                    origin={this.state.order.start}
                    destination={this.state.order.end}
                    route={this.state.order.route}
                    // location = { this.state.mapData? this.state.mapData.geometry.location : null }
                />
                <div className="order_panel">
                    <h4 style={{ padding:'0 5px'}}> 訂單資料 </h4>
                    <div style={{height: 'calc( 50% - 135px )', overflowY: 'scroll'}}>
                        <table className="table table-cs">
                            <tbody>
                                <tr>
                                    <td > 起點 </td>
                                    <td>
                                        { this.state.myLoc != null && <a href={toGoogleUrl(this.state.myLoc, this.state.order.start)}> { this.state.order.start.address }</a>}
                                        { this.state.myLoc == null && <span> { this.state.order.start.address }</span>}
                                        <i className="icon-map" style={{ marginLeft:'5px'}}/> 
                                    </td>
                                </tr>
                                {
                                    this.state.order.route && <tr>
                                        <td> 中途站 </td>
                                        <td> 
                                            <a href={toGoogleUrl(this.state.order.start, this.state.order.route)}> { this.state.order.route.address }</a> 
                                            <i className="icon-map" style={{ marginLeft:'5px'}}/> 
                                        </td>
                                    </tr>
                                }
                                <tr>
                                    <td> 終點 </td>
                                    <td> 
                                        <a href={toGoogleUrl( this.state.order.route? this.state.order.route: this.state.order.start, this.state.order.end)}> { this.state.order.end.address }</a> 
                                        <i className="icon-map" style={{ marginLeft:'5px'}}/> 
                                    </td>
                                </tr>
                                <tr>
                                    <td> 折扣 </td>
                                    <td> { this.state.order.criteria.discount == 100? "原價": this.state.order.criteria.discount == 90? "九折": "公司價" }</td>
                                </tr>
                                {
                                    this.state.order.criteria.return && <tr>
                                        <td> 來回 </td>
                                        <td> 是</td>
                                    </tr>
                                }
                                {
                                    this.state.order.criteria.fixedPrice && <tr>
                                        <td> 定食 </td>
                                        <td> $ { this.state.order.criteria.fixedPrice }</td>
                                    </tr>
                                }
                                {
                                    this.state.order.criteria.otherPhone && <tr>
                                        <td> 另外聯絡電話 </td>
                                        <td> { this.state.order.criteria.otherPhone }</td>
                                    </tr>
                                }
                                <tr>
                                    <td> 發單人姓名 </td>
                                    <td> { this.state.order.orderBy.username }</td>
                                </tr>
                                <tr>
                                    <td> 發單人電話 </td>
                                    <td> <a href={`tel:${this.state.order.orderBy.telephone_no}`}>{ this.state.order.orderBy.telephone_no } <i className="icon-phone2" style={{ marginLeft:'5px'}}/> </a></td>
                                </tr>
                                <tr>
                                    <td> 發單人身份 </td>
                                    <td> { this.state.order.orderBy.type == "driver"? "司機": "乘客" }</td>
                                </tr>
                            </tbody>
                            {
                                this.state.order.acceptBy &&
                                <tbody>
                                    <tr>
                                        <td> 司機名稱 </td>
                                        <td> { this.state.order.acceptBy.username }</td>
                                    </tr>
                                    <tr>
                                        <td> 司機電話 </td>
                                        <td> { this.state.order.acceptBy.telephone_no }</td>
                                    </tr>
                                    <tr>
                                        <td> 司機車牌號碼 </td>
                                        <td> { this.state.order.acceptBy.vehicle_reg_no }</td>
                                    </tr>
                                    <tr>
                                        <td> 接單時間 </td>
                                        <td> { moment(this.state.order.updatedAt).fromNow() }</td>
                                    </tr>
                                </tbody>
                            }
                        </table>
                    </div>
                    <div className="flex" style={{ marginTop: '16px' }}>
                        {
                            !this.state.confirmed && this.state.order.orderBy._id != this.props.user._id && <React.Fragment>
                                <button 
                                    className="btn btn-success width100"
                                    onClick={ async _ => {
                                        await api.order.confirmOrder(this.state.order._id);
                                        await this.setState({ confirmed: true });
                                        this.alert('成功確認', '你已成功確認這張柯打, 請盡快到達客戶所在地', () => {
                                                this.handleChange("show", 'alert')(false);
                                            });
                                        }}
                                    >   
                                        確認
                                    </button>
                                    <button 
                                        className="btn btn-error width100"
                                        style={{ margin:'0 5px'}}
                                        onClick={ async _ => {
                                            await api.order.releaseOrder(this.state.order._id);
                                            this.alert('取消確認', '你已取消這張柯打', _ => {
                                                this.handleChange("show", 'alert')(false);
                                                this.props.history.replace('/main');
                                                });
                                                }}
                                    >   
                                        取消
                                    </button>
                                </React.Fragment>
                        }
                        <button 
                            className="btn btn-warning width100"
                            onClick={ _ => this.props.history.replace('/main')}
                        >   
                            返回 
                        </button>
                    </div>
                </div>
            </React.Fragment>
        );
    }

    renderLandscape = props => {
        
        return <div className="flex">
                    <div style={{ flex: 1 }}>
                        <Map 
                            width="100%"
                            height="100%"
                            origin={this.state.order.start}
                            destination={this.state.order.end}
                            route={this.state.order.route}
                            // location = { this.state.mapData? this.state.mapData.geometry.location : null }
                        />
                    </div>
                    <div className="order_panel" style={{ flex: 1, height: '94%' }}>
                        <h4 style={{ padding:'0 5px'}}> 訂單資料 </h4>
                        <div style={{    height: 'calc( 100% - 86px )',overflowY: 'scroll'}}>
                            <table className="table table-cs">
                                <tbody>
                                    <tr>
                                        <td> 起點 </td>
                                        <td>
                                            { this.state.myLoc != null && <a href={toGoogleUrl(this.state.myLoc, this.state.order.start)}> { this.state.order.start.address }</a>}
                                            { this.state.myLoc == null && <span> { this.state.order.start.address }</span>}
                                            <i className="icon-map" style={{ marginLeft:'5px'}}/> 
                                        </td>
                                    </tr>
                                    {
                                        this.state.order.route && <tr>
                                            <td> 中途站 </td>
                                            <td> 
                                                <a href={toGoogleUrl(this.state.order.start, this.state.order.route)}> { this.state.order.route.address }</a> 
                                                <i className="icon-map" style={{ marginLeft:'5px'}}/> 
                                            </td>
                                        </tr>
                                    }
                                    <tr>
                                        <td> 終點 </td>
                                        <td> 
                                            <a href={toGoogleUrl(this.state.order.start, this.state.order.end)}> { this.state.order.end.address }</a> 
                                            <i className="icon-map" style={{ marginLeft:'5px'}}/> 
                                        </td>
                                    </tr>
                                    <tr>
                                        <td> 折扣 </td>
                                        <td> { this.state.order.criteria.discount == 100? "原價": this.state.order.criteria.discount == 90? "九折": "公司價" }</td>
                                    </tr>
                                    {
                                        this.state.order.criteria.return && <tr>
                                            <td> 來回 </td>
                                            <td> 是</td>
                                        </tr>
                                    }
                                    {
                                        this.state.order.criteria.fixedPrice && <tr>
                                            <td> 定食 </td>
                                            <td> $ { this.state.order.criteria.fixedPrice }</td>
                                        </tr>
                                    }
                                    {
                                        this.state.order.orderBy._id != this.props.user._id && <React.Fragment>
                                            <tr>
                                                <td> 發單人姓名 </td>
                                                <td> { this.state.order.orderBy.username }</td>
                                            </tr>
                                            <tr>
                                                <td> 發單人電話 </td>
                                                <td> <a href={`tel:${this.state.order.orderBy.telephone_no}`}>{ this.state.order.orderBy.telephone_no } <i className="icon-phone2" style={{ marginLeft:'5px'}}/> </a></td>
                                            </tr>
                                            <tr>
                                                <td> 發單人身份 </td>
                                                <td> { this.state.order.orderBy.type == "driver"? "司機": "乘客" }</td>
                                            </tr>
                                        </React.Fragment>
                                    }
                                    {
                                        this.state.order.acceptBy && this.state.order.acceptBy._id && <React.Fragment>
                                            <tr>
                                                <td> 接單人姓名 </td>
                                                <td> { this.state.order.acceptBy.username }</td>
                                            </tr>
                                            <tr>
                                                <td> 接單人電話 </td>
                                                <td> <a href={`tel:${this.state.order.acceptBy.telephone_no}`}>{ this.state.order.acceptBy.telephone_no } <i className="icon-phone2" style={{ marginLeft:'5px'}}/> </a></td>
                                            </tr>
                                            <tr>
                                                <td> 接單人身份 </td>
                                                <td> { this.state.order.acceptBy.type == "driver"? "司機": "乘客" }</td>
                                            </tr>
                                        </React.Fragment>
                                    }
                                </tbody>
                            </table>
                        </div>
                        <div className="flex" style={{ marginTop: '16px' }}>                          
                            {
                                !this.state.confirmed && this.state.order.orderBy._id != this.props.user._id && <React.Fragment>
                                    <button 
                                        className="btn btn-success width100"
                                        onClick={ async _ => {
                                            await api.order.confirmOrder(this.state.order._id);
                                            await this.setState({ confirmed: true });
                                            this.alert('成功確認', '你已成功確認這張柯打, 請盡快到達客戶所在地', () => {
                                                this.handleChange("show", 'alert')(false);
                                            });
                                        }}
                                    >   
                                        確認
                                    </button>
                                    <button 
                                        className="btn btn-error width100"
                                        style={{ margin:'0 5px'}}
                                        onClick={ async _ => {
                                            await api.order.releaseOrder(this.state.order._id);
                                            this.alert('取消確認', '你已取消這張柯打', _ => {
                                                this.handleChange("show", 'alert')(false);
                                                this.props.history.replace('/main');
                                            });
                                        }}
                                    >   
                                        取消
                                    </button>
                                </React.Fragment>
                            }
                            <button 
                                className="btn btn-warning width100"
                                onClick={ _ => this.props.history.replace('/main')}
                            >   
                                返回 
                            </button>
                        </div>
                    </div>
                </div>
    }


    oncancel = () => {
        this.props.history.replace('/main');
    }

    render(){

        if ( this.state.order == null )
            return <React.Fragment />

        return (
            <div style={{ backgroundColor:'#efefef', height:'100%', width:'100%'}}>

                {
                    this.state.alert.type == "text" && <SweetAlert
                        show={this.state.alert.show}
                        title={this.state.alert.title}
                        text={this.state.alert.text}
                        onConfirm={_ =>this.state.alert.onConfirm()}
                    />
                }
                {
                    this.state.cancel &&
                    <div className="cancel-menu">
                        <div className="canel-menu-background"/>
                        <div className="canel-menu-wrapper">
                            <div className="cancel-menu-title">
                                取消訂單
                            </div>
                            <div className="cancel-menu-content">
                                乘客已取消訂單,現在將跳回主頁
                            </div>
                            <div className="cancel-menu-button-row">
                                <div className="cancel-menu-button" onClick={() => this.oncancel()}>
                                    確定
                                </div>
                            </div>
                        </div>
                    </div>
                }

                <DeviceOrientation lockOrientation={'landscape'}>
                    <Orientation orientation='landscape' alwaysRender={false}>
                        <this.renderLandscape/>
                    </Orientation>
                    <Orientation orientation='portrait' alwaysRender={false}>
                        <this.renderPortrait/>
                    </Orientation>
                </DeviceOrientation>
            </div>
        );
    }

}


const mapStateToProps = ( state, ownProps ) => ({
    user: state.base.user,
    accessToken: state.base.accessToken
});

const mapDispatchToProps = ( dispatch, ownProps ) => ({

});

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(withCookies(View)));