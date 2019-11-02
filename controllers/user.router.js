const express = require('express');
const router = express.Router();


const { USER_MODEL } = require('../models/user.model');
const { POST_MODEL } = require('../models/post.model')
const { TOKEN_CONFIRM_MODEL } = require('../models/token.confirm')
const validateRegisterInput = require('../validation/register.validate');
const validateLoginInput = require('../validation/login.validate');
const { signPromise, verifyPromise } = require('../utils/jwt')
const nodemailer = require('nodemailer');

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const UPLOAD_CONFIG =require('../utils/multer.config')

// const imageUploader = multer({ dest: 'images/' });
// const storage = multer.diskStorage({
//     destination: "../images",
//     filename: function (req, file, cb) {
//         cb(null, "IMAGE-" + Date.now() + path.extname(file.originalname));
//     }
// });
// const upload = multer({
//     storage: storage,
//     limits:{fileSize: 1000000},
//  }).single("avatar");

router.get('/get-token/:token_register', async (req, res) => {
    const { token_register } = req.params;
    console.log(token_register);

    let isMatch = await TOKEN_CONFIRM_MODEL.findOne({
        _userId: token_register
    })
    if (!isMatch) return res.json(`Something wrong`)
    let infoUserAfterUpdate = await USER_MODEL.findByIdAndUpdate(token_register, {
        $set: {
            comfirmed: true
        }
    }, { new: true });

    res.json(`awjdkajdkawjdkawjdkawd`)

})

router.route('/register')
    .get((req, res) => {
        res.render('demodangki')
    })
    .post(async (req, res) => {
        const data = req.body;
        const { username, password, fullname, email } = data;


        const { errors, isValid } = validateRegisterInput(data);
        // console.log(errors);

        await USER_MODEL.findOne({ username }).then(user => {
            if (user) {
                // errors.exist= "Username is Exist";
                errors.unshift("Username is Exist");
            }
        })

        if (errors.length > 0) {
            res.status(200).send(errors);
        }
        else {
            const newUser = new USER_MODEL({
                username,
                email,
                fullname,
                password
            })
            await newUser
                .save()
                .then(() => console.log('Done'))
                .catch(err => console.log(err));
            res.status(201).send()

            /**Create TOKEN */
            let userCurr = await USER_MODEL.findOne({
                username: username
            })

            var token = new TOKEN_CONFIRM_MODEL({ _userId: userCurr._id, token: Math.random().toString(36).substring(7) });
            console.log('----------');


            await token.save();


            /**Send Email  */
            var transporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 465,
                secure: true,
                auth: {
                    user: "thanhandp147@gmail.com",
                    pass: "an0556274329"
                }
            });
            const mailOptions = {
                from: 'sender@email.com', // sender address
                to: email, // list of receivers
                subject: 'Subject of your email', // Subject line
                html: `<a>http://localhost:3000/get-token/${token._userId}</a>`// plain text body
                // html: `<a>https://socialnetwork113.herokuapp.com/get-token/${token._userId}</a>`// plain text body
            };
            transporter.sendMail(mailOptions, function (err, info) {
                if (err)
                    console.log(err)
                else
                    console.log(info);
            });
        }

    })


router.route('/login')
    .post(async (req, res) => {
        const data = req.body;


        const { errors, isValid } = validateLoginInput(data);
        const { usernameLogin: username, passwordLogin: password } = data;

        if (errors.length > 0) {
            // res.status(203).send(errors);
            return res.send({
                text: 'login_fail',
                errors
            });
        }

        let isExistUser = await USER_MODEL.findOne({ username });

        if (!isExistUser) {
            errors.push('Sai tên đăng nhập');
            // // return res.status(200).send(errors);
            // return res.send(errors);
            return res.send({
                text: 'login_fail',
                errors
            });
        }
        const { password: hashPwd } = isExistUser;
        let isMatch = password == hashPwd;

        if (!isMatch) {
            errors.push('Sai mật khẩu, vui lòng nhập lại');
            // return res.status(201).send(errors);
            // return res.send(errors);
            return res.send({
                text: 'login_fail',
                errors
            });
        }


        // res.status(202).send();
        if (!isExistUser.comfirmed) {
            errors.push('Your email is not confirmed');
            return res.send({
                text: 'login_fail',
                errors

            })
        } else {

            const { email, fullname, birthday, phone, avatar } = isExistUser;
            
            

            let resultExistUsername = {
                username: isExistUser.username
            }
            let signalSignToken = await signPromise(resultExistUsername);
            if (signalSignToken.error) return res.json({ error: true, message: 'something wrong' });
            const { token } = signalSignToken;
            // console.log({ token });

            return res.send({
                text: 'login_success',
                data: {
                    username: isExistUser.username,
                    token: token,
                    email,
                    fullname,
                    birthday,
                    phone,
                    avatar
                }
            })
        }

    })

router.post('/refresh-page', async (req, res) => {
    let { token } = req.body;
    let infoUserVerify = await verifyPromise(token);
    let usernameToken = infoUserVerify.data.username;
    //check token
    let infoUserDB = await USER_MODEL.findOne({
        username: usernameToken
    })
    if (infoUserDB) {
        const { fullname, email, birthday, phone, avatar } = infoUserDB;
        let signalSignToken = await signPromise(infoUserVerify);
        if (infoUserVerify.error) return res.json({ error: true, message: 'something_wrong' });

        const { token } = signalSignToken;
        return res.json({
            error: false, data: {
                username: infoUserVerify.data.username,
                token: token,
                fullname,
                email,
                birthday,
                phone,
                avatar
            }
        })
    }
})

router.post('/update_password', async (req, res) => {
    const { password1, password2, token } = req.body;
    console.log(password1, password2);

    let infoUserVerify = await verifyPromise(token);

    let infoUserCurr = await USER_MODEL.findOne({
        username: infoUserVerify.data.username
    })

    let isMatch = infoUserCurr.password == password1;
    if (!isMatch) {

        return res.send({
            flag: 'not_match_DB',
            data: ['Mật khẩu hiện tại không trùng khớp']
        })
    } else {
        console.log('-------------');

        await USER_MODEL.findOneAndUpdate(
            { username: infoUserVerify.data.username },
            { $set: { password: password2 } },
            { new: true },
            function (err, doc) {
            }
        )
        return res.send({
            flag: 'success',
            data: 'Cập nhật mật khẩu thành công'
        })
    }
})

router.post('/update_info', async (req, res) => {
    let { birthday, phone, token } = req.body;

    let infoUserVerify = await verifyPromise(token);

    let infoUserCurr = await USER_MODEL.findOne({
        username: infoUserVerify.data.username
    })

    if (birthday == '') {
        birthday = infoUserCurr.birthday
    }
    if (phone == '') {
        phone = infoUserCurr.phone
    }
    console.log({ birthday, phone });


    console.log(infoUserCurr);
    let infoUserAfterUpdate = await USER_MODEL.findOneAndUpdate(
        { username: infoUserVerify.data.username },
        {
            $set: {
                birthday: birthday,
                phone: phone
            }
        }, { new: true }
    )
    console.log(infoUserAfterUpdate);

    return res.send({
        flag: 'success',
        data: {
            birthday: infoUserAfterUpdate.birthday,
            phone: infoUserAfterUpdate.phone
        }
    })
})



router.post('/update_avatar', UPLOAD_CONFIG.single('avatar'), async (req, res) => {
    console.log(req.file);
    // console.log('/////');
    let originalname= req.file.originalname;
    
    // console.log(req.body.token);
    // let infoUserVerify = await verifyPromise(req.body.token);

    // let infoUserCurr = await USER_MODEL.findOne({
    //     username: infoUserVerify.data.username
    // })
    // console.log(infoUserCurr);
    // await USER_MODEL.findOneAndUpdate(
    //     {username: infoUserVerify.data.username},
    //     {
    //         $set:{
    //             avatar: req.file.originalname
    //         }
    //     }, { new: true }
    // )
    let pathOfAvatar= path.resolve(__dirname, `../public/upload/${originalname}`);
    
    
    // let pathOfAvatar= path(__dirname, `../public/upload/${originalname}`);
    console.log(pathOfAvatar);
    
    // res.send(originalname)
    // console.log({ __: req.file });
    // const {formData}= req.body;
})

router.get('/get_avatar/:name', async(req, res) => {
    const fileName = req.params.name;
    console.log(fileName)
    if (!fileName) {
        return res.send({
            status: false,
            message: 'no filename specified',
        })
    }
    let pathOfAvatar= path.resolve(__dirname, `../public/upload/${fileName}`);
    res.send(pathOfAvatar)
    
})



// router.get('/', async (req, res) => {
//     const { infoUser } = req.session;
//     // if (!infoUser) res.render('error', { message: 'Vui long dang nhap' });
//     if (!infoUser) return res.redirect('/register')
//     const { username: usernameCurrent, fullname, email, _id: senderID } = infoUser;
    // let inforUserDB = await USER_MODEL.findOne({
    //     username: usernameCurrent
    // })
    //     .populate('guestsRequest')
    //     .populate('friends');
//     const { usersRequest, guestsRequest, friends } = inforUserDB;
//     let listUsers = await USER_MODEL.find({
//         username: {
//             $ne: usernameCurrent
//         },
//         friends: {
//             $ne: senderID
//         },
//         usersRequest: {
//             $ne: senderID
//         }
//     })
//     let listInfoPostDB = await POST_MODEL.find({
//         author: senderID
//     })
//         .populate('author')
//     console.log(`LIST infoPOST DB: ${listInfoPostDB}`);

//     // console.log(`LOG ${listUsers}`);
//     res.render('home', { fullname, email, listUsers, usersRequest, guestsRequest, friends, listInfoPostDB })
// })
// router.get('/request-add-friend/:recieverID', async (req, res) => {
//     const { recieverID } = req.params;
//     const { infoUser } = req.session;
//     if (!infoUser) res.render('error', { message: `Vui long dang nhap` });
//     const { fullname, email, username: usernameCurrent, _id: senderID } = infoUser;

// let infoUserSenderAfterUpdated = await USER_MODEL.findByIdAndUpdate(senderID, {
//     $addToSet: {
//         usersRequest: recieverID
//     }
// }, { new: true });

//     let infoUserReceiverAfterUpdated = await USER_MODEL.findByIdAndUpdate(recieverID, {
//         $addToSet: {
//             guestsRequest: senderID
//         }
//     }, { new: true });

//     res.redirect('/user');
// })
// router.get('/request-remove-friend/:recieverID', async (req, res) => {
//     const { recieverID } = req.params;
//     const { infoUser } = req.session;
//     if (!infoUser) res.render('error', { message: `Vui long dang nhap` });
//     const { fullname, email, username: usernameCurrent, _id: senderID } = infoUser;

//     let infoUserSenderAfterUpdated = await USER_MODEL.findByIdAndUpdate(senderID, {
//         $pull: {
//             usersRequest: recieverID
//         }
//     }, { new: true });

//     let infoUserReceiverAfterUpdated = await USER_MODEL.findByIdAndUpdate(recieverID, {
//         $pull: {
//             guestsRequest: senderID
//         }
//     }, { new: true });
//     res.redirect('/user');
// })

// router.get('/resolve-friend/:recieverID', async (req, res) => {
//     const { recieverID } = req.params;
//     const { infoUser } = req.session;
//     if (!infoUser) res.render('error', { message: `Vui long dang nhap` });
//     const { fullname, email, username: usernameCurrent, _id: senderID } = infoUser;

//     let infoUserSenderAfterUpdated = await USER_MODEL.findByIdAndUpdate(senderID, {
//         $addToSet: {
//             friends: recieverID
//         },
//         $pull: {
//             guestsRequest: recieverID
//         }
//     }, { new: true });

//     let infoUserReceiverAfterUpdated = await USER_MODEL.findByIdAndUpdate(recieverID, {
//         $addToSet: {
//             friends: senderID
//         },
//         $pull: {
//             usersRequest: senderID
//         }
//     }, { new: true });
//     // console.log(`LOG: ${infoUserSenderAfterUpdated}`);

//     res.redirect('/user');
// })

// router.get('/reject-friend/:recieverID', async (req, res) => {
//     const { recieverID } = req.params;
//     const { infoUser } = req.session;
//     if (!infoUser) res.render('error', { message: 'đăng nhập di' });
//     const { fullname, email, username: usernameCurrentLogin, _id: senderID } = infoUser;

//     let infoUserSenderAfterUpdated = await USER_MODEL.findByIdAndUpdate(senderID, {
//         $pull: {
//             guestsRequest: recieverID
//         }
//     }, { new: true });

//     let infoUserReceiverAfterUpdate = await USER_MODEL.findByIdAndUpdate(recieverID, {
//         $pull: {
//             usersRequest: senderID
//         }
//     }, { new: true });

//     res.redirect('/user');
// });

// router.get('/un-friend/:friendID', async (req, res) => {
//     const { friendID } = req.params;
//     const { infoUser } = req.session;
//     if (!infoUser) res.render('error', { message: `Vui long dang nhap` });
//     const { fullname, email, username: usernameCurrent, _id: senderID } = infoUser;

//     let infoUserSenderAfterUpdated = await USER_MODEL.findByIdAndUpdate(senderID, {
//         $pull: {
//             friends: friendID
//         }
//     }, { new: true });

//     let infoUserReceiverAfterUpdated = await USER_MODEL.findByIdAndUpdate(friendID, {
//         $pull: {
//             friends: senderID
//         }
//     }, { new: true });
//     res.redirect('/user')
// })

// router.get('/demo', ( req, res) => {
//     res.render('demo-ajax');
// })


exports.USER_ROUTER = router;