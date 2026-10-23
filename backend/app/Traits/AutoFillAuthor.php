<?php

namespace App\Traits;

/**
 * 自动填充 created_by / updated_by（如果用户已登录且表含该字段）
 */
trait AutoFillAuthor
{
    protected static function bootAutoFillAuthor(): void
    {
        static::creating(function ($model) {
            if (auth()->check() && in_array('created_by', $model->getFillable())) {
                $model->created_by = auth()->id();
            }
        });

        static::updating(function ($model) {
            if (auth()->check() && in_array('updated_by', $model->getFillable())) {
                $model->updated_by = auth()->id();
            }
        });
    }
}
