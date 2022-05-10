/**
 * Custom Implementation of Promise
 */

const STATE = {
    FULFILLED: 'fullfilled',
    REJECTED: 'rejected',
    PENDING: 'pending'
}

class MyPromise {
    #thenCbs = []
    #catchCbs = []
    #state = STATE.PENDING
    #value
    //#whichInstance = 0; // for testing which instance of MyPromise class is currently executing
    onSuccessBind = this.onSuccess.bind(this);
    onFailBind = this.onFail.bind(this);

    constructor(cb/*,instance*/){
        try{
            // this.#whichInstance = instance;
            cb(this.onSuccessBind,this.onFailBind)
        }catch(e){
            this.onFail(e)
        }
    }

    runCallbacks(){
        // console.log("Rull Callback is Executed \n This value and state is: ", this, this.#state);
        // console.log("Then Cb array is: ", this.#thenCbs);
        if(this.#state === STATE.FULFILLED){
            this.#thenCbs.forEach(callback => {
                callback(this.#value)
            })

            this.#thenCbs = []
        }

        if(this.#state === STATE.REJECTED){
            this.#catchCbs.forEach(callback => {
                callback(this.#value)
            })

            this.#catchCbs = []
        }
    }

    onSuccess(value){
        // console.log("OnSuccess is executed value is: ", value);
        queueMicrotask(() => {
            /**
             * How We make our promises asynchronus, either use SetTimeOut
             * but the west way is to use queueMicrotask which originally
             * happens asynchronusly
             */

            if(this.#state !== STATE.PENDING){ 
                //inCase someone calls resolve multiple times, 
                // as it will only runs the first resolve and ignore the others;
                return 
            }

            if(value instanceof MyPromise){
                /**
                 * If Our return value is promise then we need's it's result value
                 * and again call out onSucces with this value
                 */
                value.then(this.onSuccessBind,this.onFailBind)
            }
            this.#value = value;
            this.#state = STATE.FULFILLED
            this.runCallbacks();
        })
    }

    onFail(value){

        queueMicrotask(() => {
            /**
             * How We make our promises asynchronus, either use SetTimeOut
             * but the west way is to use queueMicrotask which originally
             * happens asynchronusly
             */

            if(this.#state !== STATE.PENDING){ 
                //inCase someone calls resolve multiple times, 
                // as it will only runs the first resolve and ignore the others;
                return 
            }

            if(value instanceof MyPromise){
                /**
                 * If Our return value is promise then we need's it's result value
                 * and again call out onSucces with this value
                 */
                value.then(this.onSuccessBind,this.onFailBind)
            }

            if(this.#catchCbs.length === 0){
                // if we have a failed promise but no Catch to handle it
                throw new UncaughtPromiseError(value);
            }

            this.#value = value;
            this.#state = STATE.REJECTED
            this.runCallbacks();
        })
    }

    then(thenCb, catchCb){ //then function can take two callbacks then & catch
        // console.log("Then is executed: ", thenCb);
        return new MyPromise((resolve,reject) => {
            this.#thenCbs.push((result) => {
                if(thenCb === null){
                    resolve(result)
                    return;
                }

                try{
                    resolve(thenCb(result))
                } catch(e){
                    reject(e)
                }
            })

            this.#catchCbs.push((result) => {
                if(!catchCb){
                    reject(result)
                    return;
                }

                try{
                    resolve(catchCb(result))
                } catch(e){
                    reject(e)
                }
            })
    
            this.runCallbacks() //InCase our Promise is already been resolved
        }/*,'another instance'*/)

    }

    catch(cb){
        return this.then(null, cb);
    }

    finally(cb){
        /**
         * Finally is like then but it doesn't take the
         * parents value into account while executing the 
         * callback but just passed the result to next 
         * then or catch
         */
        return this.then( 
            (result) => {
                cb();
                return result;
            },
            (result) => {
                cb();
                throw result;
            }
        )
    }

    //Since Promises also have direct static methods so have to
    //Implement them as well
    static resolve(value){
        return new MyPromise((resolve, reject) => {
            resolve(value);
        })
    }

    static reject(value){
        return new MyPromise((resolve, reject) => {
            reject(value);
        })
    }

    //resolve only when all the Promises passed & reject if any one of them fails
    static all(promises){
        let result = [];
        let completedPromises = 0;
        return new MyPromise((resolve,reject) => {
            for(let i=0; i< promises.length; i++){
                let promise = promises[i];
                promise.then( value => {
                    completedPromises++;
                    result.push(value);
                    if(completedPromises === promises.length){
                        resolve(result)
                    }
                }).catch((reason) => {
                    reject(reason);
                })
            }
        })
    }

    //give status of all the promises when they all executed
    static allSettled(promises){
        let result = [];
        let completedPromises = 0;
        return new MyPromise( resolve => {
            for(let i=0; i< promises.length; i++){
                let promise = promises[i];
                promise.then( value => {
                    result.push({ status: STATE.FULFILLED, value})
                }).catch( reason => {
                    result.push({status: STATE.REJECTED, reason})
                }).finally( () => {
                    completedPromises++;
                    if(completedPromises === promises.length){
                        resolve(result);
                    }
                })
            }
        })
    }

    //Only the fastest promises will get resolved or rejected
    static race(promises){
        return new MyPromise( (resolve,reject) => {
            for(let i=0; i< promises.length; i++){
                let promise = promises[i];
                promise.then( value => {
                    resolve(value)
                }).catch(value => {
                    reject(value)
                })
            }
        })
    }

    //Any is just like all but it will reject if all the promises fails and
    //resolve if any one of them passes
    static any(promises){
        let errors = [];
        let count_fail_promises = 0;
        return new MyPromise((resolve,reject) => {
            for(let i=0; i<promises.length; i++){
                let promise = promises[i];
                promise.then( (result) => {
                    resolve(result)
                }).catch( reason => {
                    count_fail_promises++;
                    errors.push(reason)
                    if(count_fail_promises === promises.length){
                        reject(new AggregateError(errors,'All promises were rejected'));
                        //Doubtfull if AggregateError existed;
                    }
                })
            }
        })
    }
}

/** Handling Error if We don't have a catch in failed promise */
class UncaughtPromiseError extends Error{
    constructor(error){
        super(error)
        this.stack = `(in promise) ${error.stack}`
    }
}

/**
 * Example to illustrate the chaining of then
 */

// const pr = new MyPromise((resolve,reject) => {
//     setTimeout(() => { resolve('It is resolved') },3000);
// }/*,'1st instance'*/)

// pr.then((value) => {
//     if(value === 'It is resolved'){
//         console.log('1st then is returning +1')
//         return 'It is resolved +1'
//     }else{
//         console.log('1st then is returning -1')
//         return 'It is resolved -1'
//     }
// }).then((value) => {
//     if(value === 'It is resolved +1'){
//         console.log('2nd then is returning +2')
//         return 'It is resolved +2'
//     }else{
//         console.log('2nd then is returning -2')
//         return 'It is resolved -2'
//     }
// })

/** End of example */

module.exports = MyPromise

