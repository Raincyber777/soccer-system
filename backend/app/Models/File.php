<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class File extends Model
{
    protected $table = 'files';

    protected $fillable = [
        'original_name', 'storage_path', 'url', 'mime_type',
        'size', 'file_type',
    ];

    protected $casts = [
        'size' => 'integer',
    ];
}
