<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Dict extends Model
{
    protected $table = 'dicts';
    public $timestamps = true;

    protected $casts = [
        'sort'   => 'integer',
        'status' => 'integer',
    ];
}
