import { Injectable }    from '@angular/core';
import { Headers, Http } from '@angular/http';

import { API_URLS } from '../urls';
import { KeyService } from '../key.service';


@Injectable()
export class WorkerService {

  private headers = new Headers({'Content-Type': 'application/json'});
  public supported: boolean;
  public isSubscribed: boolean;
  swRegistration: any;

  constructor(private http: Http, private keyService: KeyService) { }


  public isBlocked(): boolean {
    return (window['Notification'].permission === 'denied');
  };

  register() {
    const that = this;
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      this.supported = true;

      this.keyService.getKeys().then((keys: any) => {
        navigator['serviceWorker'].register('sw.js')
        .then(function(swReg: any) {
          that.swRegistration = swReg;
          that.swRegistration.active.postMessage({
            'applicationServerPublicKey': keys.vapid_public_key
          });
          that.initSubscription();
        })
        .catch(function(error: any) {
          console.error('Service Worker Error', error);
        });
      });
    } else {
      this.supported = false;
      console.warn('Push messaging is not supported');
      // pushButton.textContent = 'Push Not Supported';
    }
  }

  initSubscription() {
    const that = this;
    // Set the initial subscription value
    this.swRegistration.pushManager.getSubscription()
    .then(function(subscription: any) {
      that.isSubscribed = !(subscription === null);

      that.updateSubscriptionOnServer(subscription);
    }).catch((err: any) => {
      // TODO
    });
  }

  updateSubscriptionOnServer(subscription: any) {
    return this.http.post(API_URLS.notification, JSON.stringify({subscription}), {headers: this.headers})
               .toPromise();
  }

  urlB64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }


  subscribeUser() {
    const that = this;

    this.keyService.getKeys().then((keys: any) => {
      const applicationServerKey = this.urlB64ToUint8Array(keys.vapid_public_key);
      this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      })
      .then(function(subscription: any) {

        that.updateSubscriptionOnServer(subscription);

        that.isSubscribed = true;
      })
      .catch(function(err: any) {
        // TODO
      });
    });
  }

  unsubscribeUser() {
    const that = this;
    this.swRegistration.pushManager.getSubscription()
    .then(function(subscription: any) {
      if (subscription) {
        return subscription.unsubscribe();
      }
    })
    .catch(function(error: any) {
      // TODO
    })
    .then(function() {
      that.updateSubscriptionOnServer(null);
      that.isSubscribed = false;
    });
  }


}

