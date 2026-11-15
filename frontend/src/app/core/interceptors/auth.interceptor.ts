import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isObjectStorageUpload = req.url.includes(':9090/') || req.url.includes('.s3.');
  if (isObjectStorageUpload) {
    return next(req);
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    const token = localStorage.getItem('access_token');
    if (token) {
      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      return next(authReq);
    }
  }
  return next(req);
};
