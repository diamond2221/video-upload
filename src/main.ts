import Koa from 'koa'
import Router from 'koa-router';
import multer from 'koa-multer';
import serve from 'koa-static';
import path from 'path'
import fs from 'fs-extra'
import koaBody from 'koa-body'

const app = new Koa();
const { mkdirsSync } = require('./utils/dir');
const uploadPath = path.join(__dirname, './public/upload');
const uploadTempPath = path.join(uploadPath, 'temp');
const upload = multer({ dest: uploadTempPath });
const router = new Router();
app.use(koaBody());
/**
 * single(fieldname)
 * Accept a single file with the name fieldname. The single file will be stored in req.file.
 */
router.post('/file/upload', upload.single('file'), async (ctx, next) => {
    console.log('file upload...')
    // 根据文件hash创建文件夹，把默认上传的文件移动当前hash文件夹下。方便后续文件合并。
    const { name, total, index, size, hash } = (ctx.req as any).body;

    const chunksPath = path.join(uploadPath, hash, '/');
    if (!fs.existsSync(chunksPath)) mkdirsSync(chunksPath);
    fs.renameSync((ctx.req as any).file.path, chunksPath + hash + '-' + index);
    ctx.status = 200;
    ctx.res.end('Success');
})

router.post('/file/merge_chunks', async (ctx, next) => {
    const { size, name, total, hash } = ctx.request.body;
    // 根据hash值，获取分片文件。
    // 创建存储文件
    // 合并
    const chunksPath = path.join(uploadPath, hash, '/');
    const filePath = path.join(uploadPath, `${hash}-${Date.now()}.${name.split('.').pop()}`);
    // 读取所有的chunks 文件名存放在数组中
    const chunks = fs.readdirSync(chunksPath);
    // 创建存储文件
    fs.writeFileSync(filePath, '');
    if (chunks.length !== total || chunks.length === 0) {
        ctx.status = 200;
        ctx.res.end('切片文件数量不符合');
        return;
    }
    for (let i = 0; i < total; i++) {
        // 追加写入到文件中
        fs.appendFileSync(filePath, fs.readFileSync(chunksPath + hash + '-' + i));
        // 删除本次使用的chunk
        fs.unlinkSync(chunksPath + hash + '-' + i);
    }
    fs.rmdirSync(chunksPath);
    // 文件合并成功，可以把文件信息进行入库。
    ctx.status = 200;
    ctx.res.end('合并成功');
})

router.post('/file/upload/normal', upload.single('file'), async (ctx) => {
    // 获取上传文件
    const file = (ctx.req as any).file

    // 写入目录
    const mkdirsSync = (dirname: string) => {
        if (fs.existsSync(dirname)) {
            return true
        } else {
            if (mkdirsSync(path.dirname(dirname))) {
                fs.mkdirSync(dirname)
                return true
            }
        }
        return false
    }

    // 重命名
    function rename(fileName: string) {
        return Math.random().toString(16).substr(2) + '.' + fileName.split('.').pop()
    }

    // 删除文件
    function removeTemImage(path: string) {
        fs.unlink(path, (err) => {
            if (err) {
                throw err
            }
        })
    }

    // 上传到本地
    /**
     * @description 上传到本地
     * @param {*} file
     * @returns {Promise} fileName fileFullPath
     * @file http://nodejs.cn/api/fs.html#fs_fs_createreadstream_path_options
     */
    function upToLocal(file: any) {
        return new Promise((resolve, reject) => {
            // 本地文件存储路径
            let filePath = path.join(__dirname, 'public/upload/');

            // 创建本地上传文件路径
            const confirm = mkdirsSync(filePath)
            if (!confirm) {
                console.log("------- 创建本地上传文件路径失败 ----------")
                return
            }

            // 创建可读流
            const stream = fs.createReadStream(file.path)

            // 文件名
            const fileName = rename(file.originalname)

            // 本地文件路径
            const fileFullPath = path.join(path.join(filePath, fileName))

            // 创建可写流
            const upStream = fs.createWriteStream(fileFullPath)

            // 可读流通过管道写入可写流
            stream.pipe(upStream);

            stream.on('end', () => {
                console.log('file read finished');

                // 关闭流
                stream.push(null);
                stream.read(0);

                resolve({ fileName, fileFullPath })
            })

            stream.on('error', (err) => {
                reject(err)
            })

        })
    }

    // 上传文件到本地获，获取本地的 文件名 和 文件路径
    const local_res = await upToLocal(file) as any

    ctx.status = 200
    ctx.body = {
        code: 0,
        message: 'success',
        data: {
            avatar: `${local_res.fileFullPath}`
        }
    }
})

app.use(router.routes());
app.use(router.allowedMethods());
app.use(serve(__dirname + '/static'));
app.listen(8000, () => {
    console.log('服务8000端口已经启动了');
});
