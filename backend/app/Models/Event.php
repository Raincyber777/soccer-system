<?php

namespace App\Models;

use App\Traits\AutoFillAuthor;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Event extends Model
{
    use SoftDeletes, AutoFillAuthor;

    protected $table = 'events';

    protected $fillable = [
        'name', 'year', 'category', 'register_start', 'register_end',
        'match_start', 'match_end', 'venue', 'description', 'status',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'year'          => 'integer',
        'category'      => 'integer',
        'status'        => 'integer',
        'register_start' => 'datetime',
        'register_end'  => 'datetime',
        'match_start'   => 'datetime',
        'match_end'     => 'datetime',
    ];

    public function registrations(): HasMany
    {
        return $this->hasMany(Registration::class, 'event_id');
    }
}
