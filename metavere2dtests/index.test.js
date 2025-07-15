const axios2 = require('axios');

const BACKEND_URL = "http://localhost:3000";
const WS_URL= "ws://localhost:3001";
const axios={
    post: async(...args)=>{
        try{
            const response = await axios2.post(...args); 
            return response;
        }catch(e){
            return e.response
        }
    },
    get: async(...args)=>{
        try{
            const response1 = await axios2.get(...args); 
            return response1;
        }catch(e){
            return e.response
        }
    },
    put: async(...args)=>{
        try{
            const response2 = await axios2.put(...args); 
            return response2;
        }catch(e){
            return e.response
        }
    },
    delete: async(...args)=>{
        try{
            const response3 = await axios2.delete(...args); 
            return response3;
        }catch(e){
            return e.response
        }
    }
}


describe('Authentication',()=>{
    test('user should be able to signup only once', async() => {
      const username=`myname${Math.random().toString(36).substring(7)}`
      const password="123456"
      const response=await axios.post(`${BACKEND_URL}/api/v1/signup`,{
        username:username,
        password:password,
        type:"admin"
      })
      expect(response.status).toBe(200);
      expect(response.data.userId).toBeDefined();
      const Updatedresponse=await axios.post(`${BACKEND_URL}/api/v1/signup`,{
          username:username,
          password:password,
          type:"admin"
        })
        expect(Updatedresponse.status).toBe(400);
        const DoubleUpdatedresponse=await axios.post(`${BACKEND_URL}/api/v1/signup`,{
            password:password
        })
        expect(DoubleUpdatedresponse.status).toBe(400);
    })
    
    test('user should be able to login', async() => {
      const username=`myname${Math.random().toString(36).substring(7)}`
      const password="123456"
      await axios.post(`${BACKEND_URL}/api/v1/signup`,{
        username:username,
        password:password,
        type:"admin"
      })
      const response=await axios.post(`${BACKEND_URL}/api/v1/signin`,{
        username:username,
        password:password
      })
      expect(response.status).toBe(200);
      expect(response.data.token).toBeDefined();
      
      const DoubleupdatedResponse=await axios.post(`${BACKEND_URL}/api/v1/signin`,{
        username:username,
        password:`${password}+${Math.random().toString(36).substring(7)}`
      })
      expect(DoubleupdatedResponse.status).toBe(403);
      const updatedResponse=await axios.post(`${BACKEND_URL}/api/v1/signin`,{
        username:`${username}+useradmin`,
        password:password
      })
      expect(updatedResponse.status).toBe(403);
        })
})
describe('User metadata endpoints',()=>{
    let token=""
    let avatarId=""
    let userId=""
    beforeAll(async () => {
        const username=`myname${Math.random().toString(36).substring(7)}`
        const password="123456"
        const signupResponse=await axios.post(`${BACKEND_URL}/api/v1/signup`,{
            username:username,
            password:password,
            type:"admin"
        })
        userId=signupResponse.data.userId;
        const response=await axios.post(`${BACKEND_URL}/api/v1/signin`,{
            username:username,
            password:password
        })
        token=response.data.token
        const newResponse=await axios.post(`${BACKEND_URL}/api/v1/admin/avatar`,{
            imageUrl:"https://example.com/avatar.png",
            name:"TestAvatar"
        }, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        avatarId=newResponse.data.avatarId;
    })
    test('user can not update their meta data with wrong avatarId',async()=>{
        const response=await axios.post(`${BACKEND_URL}/api/v1/user/metadata`,{
            avatarId:"wrongAvatarId",
        },{
            headers:{
                'Authorization':`Bearer ${token}`
            }
        })
        expect(response.status).toBe(400);
    })
    test('user can update their meta data with right avatarId',async()=>{
        const response=await axios.post(`${BACKEND_URL}/api/v1/user/metadata`,{
            avatarId
        },{
            headers:{
                'Authorization':`Bearer ${token}`
            }
        })
        expect(response.status).toBe(200);
    })
    test('user cannot update their meta data without token',async()=>{
        const response=await axios.post(`${BACKEND_URL}/api/v1/user/metadata`,{
            avatarId
        })
        expect(response.status).toBe(403)
    })
})
describe('user avatar information',()=>{
    let token=""
    let avatarId=""
    let userId=""
    beforeAll(async () => {
        const username=`myname${Math.random().toString(36).substring(7)}`
        const password="123456"
        const signupResponse=await axios.post(`${BACKEND_URL}/api/v1/signup`,{
            username:username,
            password:password,
            type:"admin"
        })
        userId=signupResponse.data.userId;
        const response=await axios.post(`${BACKEND_URL}/api/v1/signin`,{
            username:username,
            password:password
        })
        token=response.data.token
        const newResponse=await axios.post(`${BACKEND_URL}/api/v1/admin/avatar`,{
            imageurl:"https://example.com/avatar.png",
            name:"TestAvatar"
        }, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        avatarId=newResponse.data.avatarId;
    })
    test('user can get all available avatars',async()=>{
        const response=await axios.get(`${BACKEND_URL}/api/v1/avatars`,{
            headers:{
                'Authorization':`Bearer ${token}`
            }
        })
    //    console.log(response.data.avatars)
    //    console.log(avatarId)
        expect(response.data.avatars.length).not.toBe(0);
        const curravatar=response.data.avatars.map(x=>x.id===avatarId);
        expect(curravatar).toBeDefined();
    })
    test('get back avatar information for a user',async()=>{
        const response=await axios.get(`${BACKEND_URL}/api/v1/user/metadata/bulk?ids=[${userId}]`,{
            headers:{
                'Authorization':`Bearer ${token}`
            }
        })
        expect(response.data.avatars.length).toBe(1);
        expect(response.data.avatars[0].userId).toBe(userId);
    })
})
describe('Space information',()=>{
     let Admintoken=""
     let mapId=""
     let element1Id=""
     let element2Id=""
     let AdminId=""
     let userId=""
     let userId2=""
     let user2Token=""
     let userToken=""
     let spaceId=""
     beforeAll(async () => {
         let username=`myname${Math.random().toString(36).substring(7)}`
         let password="123456"
         const signupResponse=await axios.post(`${BACKEND_URL}/api/v1/signup`,{
             username:username,
             password:password,
             type:"admin"
         })
         AdminId=signupResponse.data.userId;
         const response=await axios.post(`${BACKEND_URL}/api/v1/signin`,{
             username:username,
             password:password
         })
         Admintoken=response.data.token
         let newResponse=await axios.post(`${BACKEND_URL}/api/v1/admin/element`,{
 	        "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
 	        "width": 1,
 	        "height": 1,
             "static": true // weather or not the user can sit on top of this element (is it considered as a collission or not)
             }, {
             headers: {
                 'Authorization': `Bearer ${Admintoken}`
             }
         })
         element1Id=newResponse.data.elementId;
         newResponse=await axios.post(`${BACKEND_URL}/api/v1/admin/element`,{
 	        "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
 	        "width": 1,
 	        "height": 1,
             "static": true // weather or not the user can sit on top of this element (is it considered as a collission or not)
             }, {
             headers: {
                 'Authorization': `Bearer ${Admintoken}`
             }
         })
         element2Id=newResponse.data.elementId;
         username=`myname${Math.random().toString(36).substring(7)}`
         password="123456"
         const usersignupResponse=await axios.post(`${BACKEND_URL}/api/v1/signup`,{
             username:username,
             password:password,
             type:"user"
         })
         userId=usersignupResponse.data.userId;
         const userresponse=await axios.post(`${BACKEND_URL}/api/v1/signin`,{
             username:username,
             password:password
         })
         userToken=userresponse.data.token;
         username=`myname${Math.random().toString(36).substring(7)}`
         password="123456"
         const user2signupResponse=await axios.post(`${BACKEND_URL}/api/v1/signup`,{
             username:username,
             password:password,
             type:"user"
         })
         userId2=user2signupResponse.data.userId;
         const user2response=await axios.post(`${BACKEND_URL}/api/v1/signin`,{
             username:username,
             password:password
         })
         user2Token=user2response.data.token;
         const mapResponse=await axios.post(`${BACKEND_URL}/api/v1/admin/map`,{
            "thumbnail": "https://thumbnail.com/a.png",
            "dimensions": "100x200",
            "name": "100 person interview room",
            "defaultElements": [{
         		elementId: element1Id,
         		   x: 20,
         		   y: 20
         	    }, {
         	     elementId: element1Id,
         		   x: 18,
         		   y: 20
         	    }, {
         	     elementId: element2Id,
         		   x: 19,
         		   y: 20
         	    }, {
         	     elementId: element2Id,
         		   x: 19,
         		   y: 20
         	    }
             ]
         },{
             headers:{
                 Authorization:`Bearer ${Admintoken}`
             }
         })
         mapId=mapResponse.data.mapId;
     })
     test('user should be able to create a space',async()=>{
         const response=await axios.post(`${BACKEND_URL}/api/v1/space`,{
             "name": "Test",
             "dimensions": "100x200",
             "mapId": mapId
         },{
             headers:{
                 Authorization:`Bearer ${userToken}`
             }
         })
         expect(response.status).toBe(200);
         expect(response.data).toHaveProperty('spaceId');
     })
     test('user should be able to create an empty space',async()=>{
         const response=await axios.post(`${BACKEND_URL}/api/v1/space`,{
             "name": "Test2",
             "dimensions": "100x200",
         },{
            headers:{
                Authorization:`Bearer ${userToken}`
             }
         })
         expect(response.status).toBe(200);
         expect(response.data).toHaveProperty('spaceId');
     })
     test('user should not be able to create a space without mapId or dimensions',async()=>{
         const response=await axios.post(`${BACKEND_URL}/api/v1/space`,{
             "name": "Test",
         },{
             headers:{
                 Authorization:`Bearer ${userToken}`
             }
         })
         expect(response.status).toBe(400);
     })
     test('user should not be able to delete a space that doesnt exists',async()=>{
         const response=await axios.delete(`${BACKEND_URL}/api/v1/space/spaceid_that_does_not_exists`,{
             headers:{
                 Authorization:`Bearer ${userToken}`
             }
         })
         expect(response.status).toBe(400);
     })
     test('user should be able to delete a space with spaceId that does exists',async()=>{
         const response=await axios.post(`${BACKEND_URL}/api/v1/space`,{
             "name": "Test",
             "dimensions": "100x200",
         },{
             headers:{
                 Authorization:`Bearer ${userToken}`
             }
         })
         spaceId=response.data.spaceId;
         const deleteresponse=await axios.delete(`${BACKEND_URL}/api/v1/space/${spaceId}`,{
             headers:{
                 Authorization:`Bearer ${userToken}`
             }
         })
         expect(deleteresponse.status).toBe(200);
     })
     test('user should not be able to delete someone elses space',async()=>{
         const userresponse=await axios.post(`${BACKEND_URL}/api/v1/space`,{
             "name": "Test1",
             "dimensions": "100x200",
         },{
             headers:{
                 Authorization:`Bearer ${userToken}`
             }
         })
         const spaceId1=userresponse.data.spaceId;
         const user2response=await axios.post(`${BACKEND_URL}/api/v1/space`,{
             "name": "Test2",
             "dimensions": "100x200",
         },{
             headers:{
                 Authorization:`Bearer ${user2Token}`
             }
         })
         const spaceId2=user2response.data.spaceId;
         const deleteresponse1=await axios.delete(`${BACKEND_URL}/api/v1/space/${spaceId2}`,{
             headers:{
                 Authorization:`Bearer ${userToken}`
             }
         })
         expect(deleteresponse1.status).toBe(403);
         const deleteresponse=await axios.delete(`${BACKEND_URL}/api/v1/space/${spaceId1}`,{
             headers:{
                 Authorization:`Bearer ${user2Token}`
             }
         })
         expect(deleteresponse.status).toBe(403);
     })
     test('admin does not have any spaces initially',async()=>{
         const response=await axios.get(`${BACKEND_URL}/api/v1/space/all`,{
             headers:{
                 Authorization:`Bearer ${Admintoken}`
             }
         })
         expect(response.data.spaces.length).toBe(0);
     })
     test('admin can get all spaces created by hismself',async()=>{
         const spacecreate=await axios.post(`${BACKEND_URL}/api/v1/space`,{
             "name": "Test",
             "dimensions": "100x200",
             "mapId": mapId
         },{
             headers:{
                 Authorization:`Bearer ${Admintoken}`
             }
         })
         spaceId=spacecreate.data.spaceId;
         const response=await axios.get(`${BACKEND_URL}/api/v1/space/all`,{
             headers:{
                 Authorization:`Bearer ${Admintoken}`
             }
         })
         const filteredSpaces=response.data.spaces.filter(space=>space.spaceId===spaceId);  
         expect(filteredSpaces).toBeDefined();
         expect(response.data.spaces.length).toBe(1)     
    })
})
describe('Arena endpoints',()=>{
     let Admintoken=""
     let mapId=""
     let element1Id=""
     let element2Id=""
     let AdminId=""
     let userId=""
     let userId2=""
     let user2Token=""
     let userToken=""
     let spaceId=""
     beforeAll(async () => {
         let username=`myname${Math.random().toString(36).substring(7)}`
         let password="123456"
         const signupResponse=await axios.post(`${BACKEND_URL}/api/v1/signup`,{
             username:username,
             password:password,
             type:"admin"
         })
         AdminId=signupResponse.data.userId;
         const response=await axios.post(`${BACKEND_URL}/api/v1/signin`,{
             username:username,
             password:password
         })
         Admintoken=response.data.token
         let newResponse=await axios.post(`${BACKEND_URL}/api/v1/admin/element`,{
 	        "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
 	        "width": 1,
 	        "height": 1,
             "static": true // weather or not the user can sit on top of this element (is it considered as a collission or not)
             }, {
             headers: {
                 'Authorization': `Bearer ${Admintoken}`
             }
         })
         element1Id=newResponse.data.elementId;
         newResponse=await axios.post(`${BACKEND_URL}/api/v1/admin/element`,{
 	        "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
 	        "width": 1,
 	        "height": 1,
             "static": true // weather or not the user can sit on top of this element (is it considered as a collission or not)
             }, {
             headers: {
                 'Authorization': `Bearer ${Admintoken}`
             }
         })
         element2Id=newResponse.data.elementId;

         username=`myname${Math.random().toString(36).substring(7)}`
         password="123456"
         const usersignupResponse=await axios.post(`${BACKEND_URL}/api/v1/signup`,{
             username:username,
             password:password,
             type:"user"
         })
         userId=usersignupResponse.data.userId;
         const userresponse=await axios.post(`${BACKEND_URL}/api/v1/signin`,{
             username:username,
             password:password
         })
         userToken=userresponse.data.token;

         username=`myname${Math.random().toString(36).substring(7)}`
         password="123456"
         const user2signupResponse=await axios.post(`${BACKEND_URL}/api/v1/signup`,{
             username:username,
             password:password,
             type:"user"
         })
         userId2=user2signupResponse.data.userId;
         const user2response=await axios.post(`${BACKEND_URL}/api/v1/signin`,{
             username:username,
             password:password
         })
         user2Token=user2response.data.token;

         const mapResponse=await axios.post(`${BACKEND_URL}/api/v1/admin/map`,{
            "thumbnail": "https://thumbnail.com/a.png",
            "dimensions": "100x200",
            "name": "100 person interview room",
            "defaultElements": [{
         		elementId: element1Id,
         		   x: 20,
         		   y: 20
         	    }, {
         	     elementId: element1Id,
         		   x: 18,
         		   y: 20
         	    }, {
         	     elementId: element2Id,
         		   x: 19,
         		   y: 20
         	    }, {
         	     elementId: element2Id,
         		   x: 19,
         		   y: 20
         	    }
             ]
         },{
             headers:{
                 Authorization:`Bearer ${Admintoken}`
             }
         })
         mapId=mapResponse.data.mapId;
         const spaceResponse=await axios.post(`${BACKEND_URL}/api/v1/space`,{
             "name": "Test",
             "dimensions": "100x200",
             "mapId": mapId
         },{
             headers:{
                 Authorization:`Bearer ${userToken}`
             }
         })
         spaceId=spaceResponse.data.spaceId;

     })
     test('incorrect spaceId should return 400',async()=>{
         const response=await axios.get(`${BACKEND_URL}/api/v1/space/spaceId_that_does_not_exists`,{
             headers:{
                 Authorization:`Bearer ${userToken}`
             }
         })
         expect(response.status).toBe(400);
     })
     test('correct spaceId should return 200',async()=>{
         const response=await axios.get(`${BACKEND_URL}/api/v1/space/${spaceId}`,{
             headers:{
                 Authorization:`Bearer ${userToken}`
             }
         })
         expect(response.status).toBe(200);
         expect(response.data).toHaveProperty('elements');
         expect(response.data.elements.length).toBe(4);
     })
     test('delete endpoint should be able to delete an element',async()=>{
         const response=await axios.get(`${BACKEND_URL}/api/v1/space/${spaceId}`,{
             headers:{
                 Authorization:`Bearer ${userToken}`
             }
         })
         const elementID=response.data.elements[0].id;
         let res = await axios.delete(`${BACKEND_URL}/api/v1/space/element`, {
            data: {id: response.data.elements[0].id},
            headers: {
                Authorization: `Bearer ${userToken}`
            }
        });


        const newResponse = await axios.get(`${BACKEND_URL}/api/v1/space/${spaceId}`, {
            headers: {
                Authorization: `Bearer ${userToken}`
            }
        });

        expect(newResponse.data.elements.length).toBe(3)
     })
     test('user should be able to add an element to a space',async()=>{
         const response=await axios.post(`${BACKEND_URL}/api/v1/space/element`,{
             "elementId": element1Id,
             "spaceId": spaceId,
             "x": 50,
             "y": 20
         },{
             headers:{
                 Authorization:`Bearer ${userToken}`
             }
         })
         expect(response.status).toBe(200);
         const newResponse=await axios.get(`${BACKEND_URL}/api/v1/space/${spaceId}`,{
             headers:{
                 Authorization:`Bearer ${userToken}`
             }
         })
         expect(newResponse.data.elements.length).toBe(4);
     })
     test('adding elements outside the space should not be valid',async()=>{
         const response=await axios.post(`${BACKEND_URL}/api/v1/space/element`,{
             "elementId": element1Id,
             "spaceId": spaceId,
             "x": 1000, // outside the space
             "y": 20000
         },{
             headers:{
                 Authorization:`Bearer ${userToken}`
             }
         })
         expect(response.status).toBe(403);
     })
 })
describe('map, elements and vatar creation endpoints (admin endpoints)',()=>{
    let Admintoken=""
    let mapId=""
    let element1Id=""
    let element2Id=""
    let AdminId=""
    let userId=""
    beforeAll(async () => {
        let username=`myname${Math.random().toString(36).substring(7)}`
        let password="123456"
        const signupResponse=await axios.post(`${BACKEND_URL}/api/v1/signup`,{
            username:username,
            password:password,
            type:"admin"
        })
        AdminId=signupResponse.data.userId;
        const response=await axios.post(`${BACKEND_URL}/api/v1/signin`,{
            username:username,
            password:password
        })
        Admintoken=response.data.token
        username=`myname${Math.random().toString(36).substring(7)}`
        password="123456"
        const usersignupResponse=await axios.post(`${BACKEND_URL}/api/v1/signup`,{
            username:username,
            password:password,
            type:"user"
        })
        userId=usersignupResponse.data.userId;
        const userresponse=await axios.post(`${BACKEND_URL}/api/v1/signin`,{
            username:username,
            password:password
        })
        userToken=userresponse.data.token;
    })
    test('user should not be able to hit these endpoints',async()=>{
        const response=await axios.post(`${BACKEND_URL}/api/v1/admin/element`,{
            "imageUrl": "https://example.com/image.png",
            "width": 1,
            "height": 1,
            "static": true
        },{
            headers:{
                Authorization:`Bearer ${userToken}`
            }
        })
        expect(response.status).toBe(403);
        const mapResponse=await axios.post(`${BACKEND_URL}/api/v1/admin/map`,{
            "thumbnail": "https://thumbnail.com/a.png",
            "dimensions": "100x200",
            "name": "100 person interview room",
            "defaultElements": [{
        		elementId: element1Id,
        		   x: 20,
        		   y: 20
        	    }, {
        	     elementId: element1Id,
        		   x: 18,
        		   y: 20
        	    }, {
        	     elementId: element2Id,
        		   x: 19,
        		   y: 20
        	    }, {
        	     elementId: element2Id,
        		   x: 19,
        		   y: 20
        	    }
            ]
        },{
            headers:{
                Authorization:`Bearer ${userToken}`
            }
        })
        expect(mapResponse.status).toBe(403);
        const avatarResponse=await axios.post(`${BACKEND_URL}/api/v1/admin/avatar`,{
            "imageurl": "https://example.com/avatar.png",
            "name": "TestAvatar"
        }, {
            headers: {
                Authorization: `Bearer ${userToken}`
            }
        })
        expect(avatarResponse.status).toBe(403);
        const updateElement=await axios.put(`${BACKEND_URL}/api/v1/admin/element/:123456`,{
            "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE"	
        },{
            headers: {
                Authorization: `Bearer ${userToken}`
            }
        })
        expect(updateElement.status).toBe(403);
    })
    test('admin should be able to create an element',async()=>{
        const response=await axios.post(`${BACKEND_URL}/api/v1/admin/element`,{
            "imageUrl": "https://example.com/image.png",
            "width": 1,
            "height": 1,
            "static": true
        },{
            headers:{
                Authorization:`Bearer ${Admintoken}`
            }
        })
        expect(response.status).toBe(200);
        element1Id=response.data.elementId;
        const response2=await axios.post(`${BACKEND_URL}/api/v1/admin/element`,{
            "imageUrl": "https://example.com/image.png",
            "width": 1,
            "height": 1,
            "static": true
        },{
            headers:{
                Authorization:`Bearer ${Admintoken}`
            }
        })
        expect(response2.status).toBe(200);
        element2Id=response.data.elementId;
        const mapResponse=await axios.post(`${BACKEND_URL}/api/v1/admin/map`,{
            "thumbnail": "https://thumbnail.com/a.png",
            "dimensions": "100x200",
            "name": "100 person interview room",
            "defaultElements": [{
        		elementId: element1Id,
        		   x: 20,
        		   y: 20
        	    }, {
        	     elementId: element1Id,
        		   x: 18,
        		   y: 20
        	    }, {
        	     elementId: element2Id,
        		   x: 19,
        		   y: 20
        	    }, {
        	     elementId: element2Id,
        		   x: 19,
        		   y: 20
        	    }
            ]
        },{
            headers:{
                Authorization:`Bearer ${Admintoken}`
            }
        })
        expect(mapResponse.status).toBe(200);
        expect(mapResponse.data).toHaveProperty('mapId');
        mapId=mapResponse.data.mapId;
        const avatarResponse=await axios.post(`${BACKEND_URL}/api/v1/admin/avatar`,{
            name: "TestAvatar",
            imageurl: "https://example.com/avatar.png"
        }, {
            headers: {
                Authorization: `Bearer ${Admintoken}`
            }
        })
        expect(avatarResponse.status).toBe(200);
        expect(avatarResponse.data).toHaveProperty('avatarId');
        const updateElement=await axios.put(`${BACKEND_URL}/api/v1/admin/element/${element1Id}`,{
            "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE"	
        },{
            headers: {
                Authorization: `Bearer ${Admintoken}`
            }
        })
        expect(updateElement.status).toBe(200);
    })
})

describe("Websocket tests", () => {
    let adminToken;
    let adminUserId;
    let userToken;
    let adminId;
    let userId;
    let mapId;
    let element1Id;
    let element2Id;
    let spaceId;
    let ws1; 
    let ws2;
    let ws1Messages = []
    let ws2Messages = []
    let userX;
    let userY;
    let adminX;
    let adminY;

    function waitForAndPopLatestMessage(messageArray) {
        return new Promise(resolve => {
            if (messageArray.length > 0) {
                resolve(messageArray.shift())
            } else {
                let interval = setInterval(() => {
                    if (messageArray.length > 0) {
                        resolve(messageArray.shift())
                        clearInterval(interval)
                    }
                }, 100)
            }
        })
    }

    async function setupHTTP() {
        const username = `kirat-${Math.random()}`
        const password = "123456"
        const adminSignupResponse = await axios.post(`${BACKEND_URL}/api/v1/signup`, {
            username,
            password,
            type: "admin"
        })

        const adminSigninResponse = await axios.post(`${BACKEND_URL}/api/v1/signin`, {
            username,
            password
        })

        adminUserId = adminSignupResponse.data.userId;
        adminToken = adminSigninResponse.data.token;
        console.log("adminSignupResponse.status")
        console.log(adminSignupResponse.status)
        
        const userSignupResponse = await axios.post(`${BACKEND_URL}/api/v1/signup`, {
            username: username + `-user`,
            password,
            type: "user"
        })
        const userSigninResponse = await axios.post(`${BACKEND_URL}/api/v1/signin`, {
            username: username + `-user`,
            password
        })
        userId = userSignupResponse.data.userId
        userToken = userSigninResponse.data.token
        console.log("useroktne", userToken)
        const element1Response = await axios.post(`${BACKEND_URL}/api/v1/admin/element`, {
            "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
            "width": 1,
            "height": 1,
          "static": true
        }, {
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        });

        const element2Response = await axios.post(`${BACKEND_URL}/api/v1/admin/element`, {
            "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
            "width": 1,
            "height": 1,
          "static": true
        }, {
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })
        element1Id = element1Response.data.id
        element2Id = element2Response.data.id

        const mapResponse = await axios.post(`${BACKEND_URL}/api/v1/admin/map`, {
            "thumbnail": "https://thumbnail.com/a.png",
            "dimensions": "100x200",
            "name": "Defaul space",
            "defaultElements": [{
                    elementId: element1Id,
                    x: 20,
                    y: 20
                }, {
                  elementId: element1Id,
                    x: 18,
                    y: 20
                }, {
                  elementId: element2Id,
                    x: 19,
                    y: 20
                }
            ]
         }, {
            headers: {
                authorization: `Bearer ${adminToken}`
            }
         })
         mapId = mapResponse.data.id

        const spaceResponse = await axios.post(`${BACKEND_URL}/api/v1/space`, {
            "name": "Test",
            "dimensions": "100x200",
            "mapId": mapId
        }, {headers: {
            "authorization": `Bearer ${userToken}`
        }})

        console.log(spaceResponse.status)
        spaceId = spaceResponse.data.spaceId
    }
    async function setupWs() {
        ws1 = new WebSocket(WS_URL)

        ws1.onmessage = (event) => {
            console.log("got back adata 1")
            console.log(event.data)
            
            ws1Messages.push(JSON.parse(event.data))
        }
        await new Promise(r => {
          ws1.onopen = r
        })

        ws2 = new WebSocket(WS_URL)

        ws2.onmessage = (event) => {
            console.log("got back data 2")
            console.log(event.data)
            ws2Messages.push(JSON.parse(event.data))
        }
        await new Promise(r => {
            ws2.onopen = r  
        })
    }
    
    beforeAll(async () => {
        await setupHTTP()
        await setupWs()
    })

    test("Get back ack for joining the space", async () => {
        console.log("insixce first test")
        ws1.send(JSON.stringify({
            "type": "join",
            "payload": {
                "spaceId": spaceId,
                "token": adminToken
            }
        }))
        console.log("insixce first test1")
        const message1 = await waitForAndPopLatestMessage(ws1Messages);
        console.log("insixce first test2")
        ws2.send(JSON.stringify({
            "type": "join",
            "payload": {
                "spaceId": spaceId,
                "token": userToken
            }
        }))
        console.log("insixce first test3")

        const message2 = await waitForAndPopLatestMessage(ws2Messages);
        const message3 = await waitForAndPopLatestMessage(ws1Messages);

        expect(message1.type).toBe("space-joined")
        expect(message2.type).toBe("space-joined")
        expect(message1.payload.users.length).toBe(0)
        expect(message2.payload.users.length).toBe(1)
        expect(message3.type).toBe("user-joined");
        expect(message3.payload.x).toBe(message2.payload.spawn.x);
        expect(message3.payload.y).toBe(message2.payload.spawn.y);
        expect(message3.payload.userId).toBe(userId);

        adminX = message1.payload.spawn.x
        adminY = message1.payload.spawn.y

        userX = message2.payload.spawn.x
        userY = message2.payload.spawn.y
    })

    test("User should not be able to move across the boundary of the wall", async () => {
        ws1.send(JSON.stringify({
            type: "move",
            payload: {
                x: 1000000,
                y: 10000
            }
        }));

        const message = await waitForAndPopLatestMessage(ws1Messages);
        expect(message.type).toBe("movement-rejected")
        expect(message.payload.x).toBe(adminX)
        expect(message.payload.y).toBe(adminY)
    })

    test("User should not be able to move two blocks at the same time", async () => {
        ws1.send(JSON.stringify({
            type: "move",
            payload: {
                x: adminX + 2,
                y: adminY
            }
        }));

        const message = await waitForAndPopLatestMessage(ws1Messages);
        expect(message.type).toBe("movement-rejected")
        expect(message.payload.x).toBe(adminX)
        expect(message.payload.y).toBe(adminY)
    })

    test("Correct movement should be broadcasted to the other sockets in the room",async () => {
        ws1.send(JSON.stringify({
            type: "move",
            payload: {
                x: adminX + 1,
                y: adminY,
                userId: adminId
            }
        }));

        const message = await waitForAndPopLatestMessage(ws2Messages);
        expect(message.type).toBe("movement")
        expect(message.payload.x).toBe(adminX + 1)
        expect(message.payload.y).toBe(adminY)
    })

    test("If a user leaves, the other user receives a leave event", async () => {
        ws1.close()
        const message = await waitForAndPopLatestMessage(ws2Messages);
        expect(message.type).toBe("user-left")
        expect(message.payload.userId).toBe(adminUserId)
    })
})